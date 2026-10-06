import { buildLink } from '../site.js';

const EXAMPLE_PROMPT =
    'Build a small online shop for my ceramics studio selling three mugs at $28, $32 and $36. Let people choose a quantity and pay by card with Stripe Checkout. Record every paid order with the buyer\'s email and what they bought, and give me an admin page that lists orders, newest first.';

export default {
    slug: 'guides/how-to-accept-payments-in-your-app',
    parent: 'guides',
    updated: '2026-10-07',
    priority: 0.7,
    changefreq: 'monthly',
    navLabel: 'How to accept payments in your app',
    type: 'guide',
    readingTime: '6 min read',

    title: 'How to Accept Payments in an App Built With AI | Puter',
    description:
        'Take card payments in an app made with Puter AI Builder. Create a Stripe account, copy an API key, give it to the builder, and test with a test card before going live.',
    ogTagline: 'Stripe account, one key, one sentence',

    hero: {
        eyebrow: 'Guide',
        h1: 'How to accept payments in your app',
        lead:
            'To take payments in an app built with Puter AI Builder, create a Stripe account, copy an API key from the Stripe Dashboard, and paste it into the conversation with a request like "let people pay for this with Stripe". The builder writes the checkout and a small backend that holds the key.',
    },

    sections: [
        {
            type: 'steps',
            id: 'steps',
            heading: 'The five steps',
            intro:
                'Start in test mode. Test payments use fake card numbers and move no money, so you can try the whole flow as many times as you like.',
            schema: {
                name: 'How to accept payments in an app built with AI',
                description:
                    'Connect a Stripe account to an app made with Puter AI Builder, test the checkout with a test card, and switch to live payments.',
                totalTime: 'PT15M',
            },
            items: [
                {
                    title: 'Create a Stripe account',
                    body:
                        'Sign up at [stripe.com](https://stripe.com). It is free, and you can create keys and take test payments before you give Stripe any business details.',
                },
                {
                    title: 'Copy a test key',
                    body:
                        'Open the [API keys page](https://dashboard.stripe.com/apikeys) with the Dashboard in sandbox (test) mode and copy the secret key. Test keys start with `sk_test_`. For a tighter key, choose Create restricted key and give it only Checkout Sessions: Write.',
                },
                {
                    title: 'Ask for payments and paste the key',
                    body:
                        'Tell the builder what you sell and at what price, for example "add a Buy button for the $40 workshop ticket and take payment with Stripe", and paste the key in the same message. If you ask before pasting a key, the builder builds the rest and asks you for it.',
                },
                {
                    title: 'Pay with a test card',
                    body:
                        'In the preview, click your Buy button and pay with card number 4242 4242 4242 4242, any future expiry date and any three-digit CVC. The payment shows up under Payments in your Stripe Dashboard, and your app shows its confirmation.',
                },
                {
                    title: 'Go live',
                    body:
                        'In Stripe, activate your account by adding your business details and a bank account for payouts. Then copy your live key (`sk_live_` or `rk_live_`), give it to the builder with "switch to this live key", and publish.',
                },
            ],
        },

        {
            type: 'prose',
            id: 'what-gets-built',
            heading: 'What the builder makes',
            body: [
                'Your app gets two parts. The page your visitors see has the products and a Buy button. A [serverless worker](https://docs.puter.com/Workers/), a small backend that runs on Puter, holds your Stripe key and talks to Stripe.',
                'When a visitor clicks Buy, the worker asks Stripe for a [Checkout Session](https://docs.stripe.com/payments/checkout) and the visitor is sent to a payment page hosted by Stripe. Card details are typed into Stripe\'s page, so they never pass through your app. After paying, the visitor comes back to your app, and the worker asks Stripe whether that session was paid before the app confirms the order.',
                'A few rules are built in so the checkout cannot be tricked:',
            ],
            list: [
                '**Prices live in the worker.** The browser only says which item and how many. Someone editing the page in their browser cannot change what they are charged.',
                '**Coming back is not proof of payment.** The app checks the payment with Stripe before it confirms an order or unlocks anything.',
                '**Buyers do not need an account.** Visitors pay as guests. They do not need a Puter account or a Stripe account.',
                '**It works in the preview.** The checkout runs in the draft preview and in the published app, so you can test before anyone else sees it.',
            ],
        },

        {
            type: 'prose',
            id: 'key-safety',
            heading: 'Where your key goes',
            body: [
                'The builder puts the key in the worker\'s code and nowhere else. It is not written into any page or script that your visitors\' browsers load, so it cannot be found with the browser\'s developer tools.',
                'The key is also part of your conversation with the builder. That conversation is saved in your Puter account and sent to the AI model that writes the app. Stripe advises against sharing keys over chat, so two habits keep this low risk:',
            ],
            list: [
                '**Build with a test key.** A test key cannot move real money. Switch to a live key only when the app is ready.',
                '**Use a restricted key for live payments.** Stripe [recommends restricted keys](https://docs.stripe.com/keys/restricted-api-keys) for keys you give to AI tools. A key limited to Checkout Sessions: Write can start checkouts and read their results, but cannot issue refunds, read your customer list, or change your account. If a checkout fails with a permission error, the message names the permission to add.',
            ],
            after: [
                'If you think a key has leaked, roll it on the API keys page. The old key stops working right away. Give the new key to the builder and it updates the worker.',
            ],
        },

        {
            type: 'prose',
            id: 'webhooks',
            heading: 'Subscriptions and missed orders',
            body: [
                'By default the app records an order when the buyer returns from Stripe. A buyer who pays and closes the tab before your app loads is charged, but your app never hears about it. You still see the payment in your Stripe Dashboard.',
                'For subscriptions, or when every order has to be recorded, Stripe uses [webhooks](https://docs.stripe.com/webhooks), messages Stripe sends to your backend when something happens. Ask for them ("make sure every paid order is recorded even if the buyer closes the page") and the builder adds a webhook route to the worker. It then asks you to add that route\'s address as an event destination in the Stripe Dashboard and to paste the signing secret Stripe shows you, which starts with `whsec_`.',
            ],
        },

        {
            type: 'prose',
            id: 'fees',
            heading: 'Fees, payouts and who you pay',
            body: [
                'Payments go straight to your own Stripe account. Puter takes no share and adds no fee.',
                'Stripe charges per payment. In the United States its [listed price](https://stripe.com/pricing) is 2.9% plus 30 cents for a domestic card, with extra percentages for international cards and currency conversion. Prices differ by country.',
                'Stripe pays out to your bank account. According to [Stripe\'s payout docs](https://docs.stripe.com/payouts), the first payout typically arrives 7 to 14 days after your first live payment, and later ones follow a regular schedule. Refunds, disputes and receipts are handled in the Stripe Dashboard.',
            ],
        },

        {
            type: 'prose',
            id: 'limits',
            heading: 'What this does not cover',
            body: [
                'This setup is for selling your own products and services. It does not cover:',
            ],
            list: [
                '**Marketplaces.** Paying out to other sellers, such as in a booking site with many hosts, needs Stripe Connect, which this flow does not set up.',
                '**Payments inside app stores.** Puter builds web apps. If you later wrap one for the App Store or Google Play, their rules on digital goods apply, and those usually require their own in-app purchase systems.',
                '**Every country.** Stripe accepts cards from around the world, but your business has to be based in one of the [countries Stripe supports](https://stripe.com/global). Check that list before you build.',
                '**Taxes.** Stripe does not charge sales tax or VAT for you unless you turn on Stripe Tax. Whether you need to collect it depends on where you and your buyers are.',
            ],
        },

        {
            type: 'faq',
            id: 'faq',
            heading: 'Common questions',
            items: [
                {
                    q: 'Do test payments use real money?',
                    a: [
                        'No. With a test key, payments go through Stripe\'s sandbox, and card networks never see them. Only test card numbers like 4242 4242 4242 4242 work. Do not enter a real card in test mode.',
                    ],
                },
                {
                    q: 'Do I need a registered business?',
                    a: [
                        'Not to test. To take live payments, Stripe asks you to verify who you are and what you sell. Many countries let you sign up as an individual or sole proprietor. Stripe lists what it needs during activation.',
                    ],
                },
                {
                    q: 'Can I change prices later?',
                    a: [
                        'Yes. Tell the builder the new price ("make the large mug $38"). Prices are set in the app\'s backend, so you do not need to create products in Stripe first.',
                    ],
                },
                {
                    q: 'Can I sell subscriptions?',
                    a: [
                        'Yes. Ask for a monthly or yearly plan and the builder sets the checkout to subscription mode. Subscriptions renew without the buyer visiting your app, so the builder also adds a webhook route and asks you to connect it in Stripe. Most subscription apps also need buyers to sign in, so the app knows who has an active plan.',
                    ],
                },
                {
                    q: 'Where do I see orders and refunds?',
                    a: [
                        'Every payment, refund and dispute is in your Stripe Dashboard. If you want a list inside your app as well, ask for an admin page of paid orders.',
                    ],
                },
                {
                    q: 'Can I use PayPal or another payment provider?',
                    a: [
                        'The builder is set up for Stripe. Stripe Checkout can show other methods, such as Apple Pay, Google Pay and local options, which you turn on in the Stripe Dashboard. Other providers may work if you give the builder their API key and documentation, but they are not tested.',
                    ],
                },
            ],
        },

        {
            type: 'cta',
            heading: 'Build a shop that takes payments',
            body: 'A three-product shop with Stripe Checkout and an order list. Have a test key ready to paste.',
            label: 'Open with this prompt',
            href: buildLink(EXAMPLE_PROMPT),
        },
    ],

    related: ['guides/how-to-build-an-app-with-ai', 'guides/how-to-build-a-website-with-ai', 'ai-saas-builder', 'ai-app-builder'],
};
