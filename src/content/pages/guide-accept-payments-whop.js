import { buildLink } from '../site.js';

const EXAMPLE_PROMPT =
    'Build a small online shop for my ceramics studio selling three mugs at $28, $32 and $36. Let people choose a quantity and pay with Whop.';

export default {
    slug: 'guides/how-to-accept-payments-with-whop',
    parent: 'guides',
    updated: '2026-10-12',
    priority: 0.6,
    changefreq: 'monthly',
    navLabel: 'How to accept payments with Whop',
    type: 'guide',
    readingTime: '4 min read',

    title: 'How to Accept Whop Payments in an App Built With AI | Puter',
    description:
        'Take payments with Whop in an app made with Puter AI Builder. Create a sandbox account, copy your API key, give it to the builder, and test with a test card.',
    ogTagline: 'Whop sandbox, one key, one sentence',

    hero: {
        eyebrow: 'Guide',
        h1: 'How to accept payments with Whop',
        lead:
            'In this guide you will add payments to an app built with Puter AI Builder using Whop. You need a Whop account and an API key. The builder writes the rest.',
    },

    sections: [
        {
            type: 'prose',
            id: 'why-whop',
            heading: 'Stripe or Whop',
            body: [
                'The builder uses [Stripe](/guides/how-to-accept-payments-with-stripe/) by default. Use Whop if Stripe does not accept businesses from your country. Whop says it supports buyers in [195 countries](https://docs.whop.com/developer/guides/accept-payments) and shows each buyer the payment methods used where they live.',
            ],
        },

        {
            type: 'steps',
            id: 'steps',
            heading: 'Steps',
            schema: {
                name: 'How to accept Whop payments in an app built with AI',
                description:
                    'Connect a Whop sandbox account to an app made with Puter AI Builder and test the checkout with a test card.',
                totalTime: 'PT10M',
            },
            items: [
                {
                    title: 'Sign up for the Whop sandbox',
                    body:
                        'Create an account at [sandbox.whop.com](https://sandbox.whop.com). The sandbox is a separate copy of Whop for testing. Payments there use test cards and move no money.',
                },
                {
                    title: 'Create an API key',
                    body:
                        'Open the [Developer page](https://sandbox.whop.com/dashboard/developer) in your sandbox dashboard. Under Account API Keys, select Create, give the key a name, and choose the Admin role. Copy the key when Whop shows it.',
                },
                {
                    title: 'Give the key to the builder',
                    body:
                        'Paste the key into the builder, say it is a Whop sandbox key, and say what you want to sell, for example "add a Buy button for the $40 workshop ticket and take payment with Whop".',
                },
                {
                    title: 'Test the checkout',
                    body:
                        'In the preview, click your Buy button. Checkout opens in a new tab. Pay with card number 4242 4242 4242 4242, any future expiry date and any three-digit CVC. Card 4000 0000 0000 0002 is declined, so you can test that too. The payment shows up under Payments in your sandbox dashboard. Whop lists more [test cards](https://docs.whop.com/developer/guides/sandbox). The sandbox only takes cards, so other payment methods appear only after you go live.',
                },
            ],
        },

        {
            type: 'prose',
            id: 'examples',
            heading: 'Example requests',
            body: [
                'Say what you sell, the price, and what should happen after someone pays. For example:',
            ],
            list: [
                '"Add a Buy button for my $29 ebook and pay with Whop. Show a download link after payment."',
                '"Sell tickets to my workshop at $40 each using Whop."',
                '"Add two Whop plans, Basic at $9 a month and Pro at $19 a month."',
            ],
        },

        {
            type: 'prose',
            id: 'subscriptions',
            heading: 'Selling subscriptions',
            body: [
                'Ask for a monthly or yearly plan, for example "charge $9 a month for the pro plan with Whop". Checkout works the same way as a one-time payment.',
                'Subscribers sign in with a Puter account before they pay, so the app knows who has a plan. Each time a subscriber opens a paid feature, the app checks with Whop that their membership is still active. A new plan works as soon as the subscriber returns from checkout. Renewals, failed payments and cancellations take effect within a few minutes. One-time purchases do not need sign-in.',
            ],
            after: [
                'The builder adds a Manage subscription link that opens Whop\'s own billing page, where subscribers can cancel or change their card. You do not need to set it up.',
            ],
        },

        {
            type: 'prose',
            id: 'go-live',
            heading: 'Taking real payments',
            body: [
                'Sandbox and live are separate Whop accounts, so a sandbox key never charges real cards. When the app works in the sandbox, sign up at [whop.com](https://whop.com) with your real business details. Create an API key on the [Developer page](https://whop.com/dashboard/developer), give it to the builder with "switch to this live Whop key", and publish. Make one small real purchase to check that it works, then refund it in the Whop dashboard.',
                'Treat the key like a password. The builder keeps it in your app\'s backend, not in the pages your visitors load. For your live key, consider a custom permission set instead of Admin, so a leaked key can do less. If you think a key has leaked, delete it on the Developer page and give a new one to the builder.',
            ],
        },

        {
            type: 'faq',
            id: 'faq',
            heading: 'Common questions',
            items: [
                {
                    q: 'Does Puter take a cut of payments?',
                    a: [
                        'No. Payments go to your own Whop account. Whop charges its own [fees](https://whop.com/pricing).',
                    ],
                },
                {
                    q: 'Can I switch an app from Stripe to Whop?',
                    a: [
                        'Yes. Ask the builder to "switch payments to Whop" and paste your Whop key. Existing Stripe subscribers stay on Stripe and would need to subscribe again through Whop.',
                    ],
                },
                {
                    q: 'Where do I see orders and refunds?',
                    a: [
                        'In your Whop dashboard, under Payments.',
                    ],
                },
            ],
        },

        {
            type: 'cta',
            heading: 'Build a shop that takes payments',
            body: 'A three-product shop with Whop checkout. Have your sandbox API key ready to paste.',
            label: 'Open with this prompt',
            href: buildLink(EXAMPLE_PROMPT),
        },
    ],

    related: ['guides/how-to-accept-payments-with-stripe', 'guides/how-to-build-an-app-with-ai', 'ai-saas-builder', 'ai-app-builder'],
};
