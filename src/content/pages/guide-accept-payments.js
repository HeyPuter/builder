import { buildLink } from '../site.js';

const EXAMPLE_PROMPT =
    'Build a small online shop for my ceramics studio selling three mugs at $28, $32 and $36. Let people choose a quantity and pay by card with Stripe Checkout. Record every paid order with the buyer\'s email and what they bought, and give me an admin page that lists orders, newest first.';

export default {
    slug: 'guides/how-to-accept-payments-with-stripe',
    parent: 'guides',
    updated: '2026-10-07',
    priority: 0.7,
    changefreq: 'monthly',
    navLabel: 'How to accept payments with Stripe',
    type: 'guide',
    readingTime: '4 min read',

    title: 'How to Accept Stripe Payments in an App Built With AI | Puter',
    description:
        'Take card payments in an app made with Puter AI Builder. Create a Stripe account, copy your secret key, give it to the builder, and test with a test card.',
    ogTagline: 'Stripe account, one key, one sentence',

    hero: {
        eyebrow: 'Guide',
        h1: 'How to accept payments with Stripe',
        lead:
            'In this guide you will add card payments to an app built with Puter AI Builder using Stripe. You need a Stripe account and its secret key. The builder writes the rest.',
    },

    sections: [
        {
            type: 'steps',
            id: 'steps',
            heading: 'Steps',
            schema: {
                name: 'How to accept Stripe payments in an app built with AI',
                description:
                    'Connect a Stripe account to an app made with Puter AI Builder and test the checkout with a test card.',
                totalTime: 'PT10M',
            },
            items: [
                {
                    title: 'Sign up for Stripe',
                    body:
                        'Create an account at [stripe.com](https://stripe.com). You do not need a registered business yet. A new account starts in test mode, where payments use fake cards and move no money.',
                },
                {
                    title: 'Copy your secret key',
                    body:
                        'Open the [API keys page](https://dashboard.stripe.com/apikeys) in the Stripe Dashboard. There are two keys. The publishable key starts with `pk_test_` and the secret key starts with `sk_test_`. Copy the secret key.',
                },
                {
                    title: 'Give the key to the builder',
                    body:
                        'Paste the secret key into the builder and say what you want to sell, for example "add a Buy button for the $40 workshop ticket and take payment with Stripe".',
                },
                {
                    title: 'Test the checkout',
                    body:
                        'In the preview, click your Buy button and pay with card number 4242 4242 4242 4242, any future expiry date and any three-digit CVC. The payment shows up under Payments in your Stripe Dashboard. Stripe lists more [test cards](https://docs.stripe.com/testing), such as cards that get declined. Checkout works in the draft preview, so you can test before you publish.',
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
                '"Add a Buy button for my $29 ebook and show a download link after payment."',
                '"Sell tickets to my workshop at $40 each, up to 20 tickets, and show how many are left."',
                '"Add a donate button where people choose $5, $10 or $25."',
                '"Add two plans, Basic at $9 a month and Pro at $19 a month."',
            ],
        },

        {
            type: 'prose',
            id: 'subscriptions',
            heading: 'Selling subscriptions',
            body: [
                'Ask for a monthly or yearly plan, for example "charge $9 a month for the pro plan". Checkout works the same way as a one-time payment.',
                'A subscription renews without the buyer visiting your app, so your app needs Stripe to tell it when a renewal goes through or a subscription ends. Stripe does this with a [webhook](https://docs.stripe.com/webhooks), a message it sends to your app\'s backend. The builder adds the webhook to your app, then asks you to connect it in Stripe:',
            ],
            list: [
                'Open [Webhooks](https://dashboard.stripe.com/webhooks) in the Stripe Dashboard and add a destination.',
                'Select the events `checkout.session.completed`, `customer.subscription.updated` and `customer.subscription.deleted`.',
                'Paste the webhook address the builder gives you. It ends in `/stripe-webhook`.',
                'Copy the signing secret Stripe shows, which starts with `whsec_`, and paste it into the builder.',
            ],
            after: [
                'To check a renewal without waiting a month, use Stripe\'s [test clocks](https://docs.stripe.com/billing/testing/test-clocks), which move a test subscription forward in time.',
                'For the app to know which visitor has an active plan, subscribers sign in before they pay, which means they need a Puter account. One-time purchases do not need sign-in.',
                'To let subscribers cancel or change their card, the builder asks you to turn on Stripe\'s [customer portal](https://docs.stripe.com/customer-management) and paste its login link, then adds a Manage subscription link to your app.',
            ],
        },

        {
            type: 'prose',
            id: 'go-live',
            heading: 'Taking real payments',
            body: [
                'When the app works in test mode, activate your Stripe account by adding your business details and a bank account for payouts. Then copy your live secret key, which starts with `sk_live_`, give it to the builder with "switch to this live key", and publish. Make one small real purchase to check that it works, then refund it in the Stripe Dashboard.',
                'Treat the secret key like a password. The builder keeps it in your app\'s backend, not in the pages your visitors load. For your live key, consider a [restricted key](https://docs.stripe.com/keys/restricted-api-keys) (`rk_live_`) with only Checkout Sessions: Write, so a leaked key cannot refund money or read your customers. If you think a key has leaked, roll it on the API keys page and give the new one to the builder.',
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
                        'No. Payments go to your own Stripe account. Stripe charges its own [per-payment fee](https://stripe.com/pricing).',
                    ],
                },
                {
                    q: 'Can I ask for payments before I have a key?',
                    a: [
                        'Yes. The builder builds the rest of the app first, then asks you for the key.',
                    ],
                },
                {
                    q: 'Where do I see orders and refunds?',
                    a: [
                        'In your Stripe Dashboard. If you want a list inside your app too, ask the builder for an admin page of paid orders.',
                    ],
                },
            ],
        },

        {
            type: 'cta',
            heading: 'Build a shop that takes payments',
            body: 'A three-product shop with Stripe Checkout and an order list. Have your test secret key ready to paste.',
            label: 'Open with this prompt',
            href: buildLink(EXAMPLE_PROMPT),
        },
    ],

    related: ['guides/how-to-build-an-app-with-ai', 'guides/how-to-build-a-website-with-ai', 'ai-saas-builder', 'ai-app-builder'],
};
