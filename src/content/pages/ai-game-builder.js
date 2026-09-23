import { buildLink, LINKS } from '../site.js';

export default {
    slug: 'ai-game-builder',
    parent: 'use-cases',
    updated: '2026-09-23',
    priority: 0.9,
    changefreq: 'weekly',
    navLabel: 'AI game builder',

    title: 'AI Game Builder - Make playable browser games for free',
    description:
        'Build a game with AI, no coding required. Describe it, play it in the live preview, and publish a link anyone can play on a phone or desktop. Free to start.',
    ogTagline: 'From a sentence to a playable game',

    hero: {
        eyebrow: 'AI game builder',
        h1: 'AI game builder that hands you a playable game',
        lead:
            'Make a game with AI without writing a line of code. Puter AI Builder turns your idea into a browser game you can play right away and share with a link.',
        cta: { label: 'Start building', href: '/' },
        secondary: { label: 'See what to build', href: '/what-to-build/' },
        note: 'Free with a [Puter](' + LINKS.puter + ') account. Runs in any modern browser, including on a phone.',
        demo: {
            prompt: 'Build an endless runner where a fox dodges obstacles, with a high score board',
            app: {
                name: 'foxdash.puter.site',
                header: 'Fox Dash',
                blocks: [
                    {
                        kind: 'stats',
                        items: [
                            { value: '1,240', label: 'Best run' },
                            { value: '38', label: 'Players today' },
                            { value: '312', label: 'Coins banked' },
                        ],
                    },
                    {
                        kind: 'list',
                        rows: [
                            { title: 'Maya', sub: 'Run 14 · 1,240 m', tag: 'Top' },
                            { title: 'Jonah', sub: 'Run 6 · 980 m', tag: 'New' },
                            { title: 'Priya', sub: 'Run 22 · 870 m', tag: '3rd' },
                        ],
                    },
                ],
            },
        },
    },

    sections: [
        {
            type: 'grid',
            id: 'what-you-get',
            heading: 'What you get',
            intro:
                'Everything you need to go from an idea to a game people can play.',
            items: [
                {
                    icon: 'wand',
                    title: 'Writes the whole game',
                    body:
                        'Describe the game and Puter AI Builder writes it: the mechanics, controls, scoring, a title screen, a game-over screen, and a restart. It runs in the live preview the moment it is written, so you play it instead of reading about it.',
                },
                {
                    icon: 'shieldCheck',
                    title: 'Catches its own bugs',
                    body:
                        'After every change the builder runs the game and watches for errors. If something breaks, it reads the file, fixes the cause, and verifies again before handing it back to you.',
                },
                {
                    icon: 'cursor',
                    title: 'Point at what you want changed',
                    body:
                        'Click the score counter, a button, or the player sprite in the live preview and say what to do with it. Precise edits to the exact thing you mean, without describing where it is.',
                },
                {
                    icon: 'phone',
                    title: 'Playable on any phone from a link',
                    body:
                        'Games work on phones, tablets, and desktops from the same link, with touch and keyboard controls as you ask for them. Anyone can add the game to their home screen and launch it full screen like a native app.',
                },
                {
                    icon: 'database',
                    title: 'Saves, leaderboards, and multiplayer included',
                    body:
                        'A backend comes with every game. Player accounts, saved progress, shared high-score tables, and peer-to-peer multiplayer are available from the moment the game exists, with nothing to set up.',
                },
                {
                    icon: 'users',
                    title: 'Free to run at any scale',
                    body:
                        'Hosting is included, and anything players use, like saves or AI features, is covered by their own [Puter](' + LINKS.puter + ') account. If your game goes viral, you don\'t get a surprise bill. [How it works](' + LINKS.userPays + ').',
                },
            ],
        },

        {
            type: 'split',
            id: 'last-mile',
            heading: 'A game that runs, not a demo that almost does',
            intro:
                'The first version of a game is the easy part. Getting it to feel right, and keeping it working while you change things, is where the time goes. These three things get you there faster.',
            items: [
                {
                    title: 'Errors get fixed before you see them',
                    art: 'verify',
                    body: [
                        'Every change is run and checked before it comes back to you. A collision that throws, a loop that stalls, a screen that never appears: Puter AI Builder sees the error, fixes it, and checks again.',
                        'You spend your time on whether the game is fun, not on why it stopped working.',
                    ],
                },
                {
                    title: 'Try a mechanic, undo it if it isn\'t fun',
                    art: 'history',
                    body: [
                        'Tuning a game means trying things: faster enemies, a double jump, a shorter timer. Every change is saved as a version, so you can try anything and go back in a click if it made the game worse.',
                        'Nothing is spent on a failed attempt except the minute it took, and no version is ever lost.',
                    ],
                },
                {
                    title: 'Your game is real web files',
                    art: 'files',
                    body: [
                        'What comes out is standard HTML, CSS, and JavaScript. Download the whole project as a zip and it runs on any static host, or straight off your disk.',
                        'There is no proprietary runtime and no export wall, so the game is never stuck inside the tool that made it.',
                    ],
                },
            ],
        },

        {
            type: 'steps',
            id: 'how-to',
            heading: 'How to build a game with AI',
            intro: 'Four steps from an idea to a game people can play.',
            schema: {
                name: 'How to build a game with AI',
                description:
                    'Build and publish a playable browser game from a plain-English description using the AI game builder at builder.puter.com.',
            },
            items: [
                {
                    title: 'Describe the game',
                    body:
                        'A sentence or two is enough: the genre, how the player moves, how they score, and how they lose. The more specific you are about the feel you want, the closer the first version will be.',
                },
                {
                    title: 'Play it',
                    body:
                        'Puter AI Builder writes the game, runs it, and checks that it works. A first playable version is usually ready in a couple of minutes, in the preview beside the chat.',
                },
                {
                    title: 'Tune it by talking, or by pointing',
                    body:
                        'Ask for the next change in plain language: harder levels, a power-up, a different look. Or click any element in the preview and say what should be different. Every version is saved, so you can always go back.',
                },
                {
                    title: 'Publish it',
                    body:
                        'Press Publish to get a public link anyone can play on a phone or a desktop. You can also export the game and take it anywhere.',
                },
            ],
        },

        {
            type: 'prompts',
            id: 'starters',
            heading: 'Not sure where to start? Try one of these',
            intro:
                'Pick one and Puter AI Builder makes it for you. Then make it yours by describing what to change.',
            items: [
                {
                    title: 'Endless runner',
                    body: 'One-tap jumping, rising speed, and a high score that sticks.',
                    prompt:
                        'Build an endless runner where a fox runs across a scrolling forest, jumps with a tap or the space bar, dodges rocks and logs, and collects coins. Speed up gradually, show the distance and coin count during the run, and save my best run to my Puter account so it survives between visits.',
                },
                {
                    title: 'Daily word puzzle',
                    body: 'A five-letter guessing game with streaks and a share button.',
                    prompt:
                        'Build a daily word puzzle where I guess a five-letter word in six tries and each letter turns green, yellow, or gray. Use the same word for everyone on a given day, keep an on-screen keyboard that reflects what I have learned, save my streak and stats to my Puter account, and add a share button that copies my result as emoji squares.',
                },
                {
                    title: 'Two-player pong',
                    body: 'Play a friend on another device over a link.',
                    prompt:
                        'Build a two-player pong game where I create a room, share a link, and a friend on their own device joins to play against me in real time using Puter\'s peer-to-peer API. Add a first-to-seven scoreboard, a rematch button, and touch controls so it works on phones as well as with the keyboard.',
                },
                {
                    title: 'AI trivia quiz',
                    body: 'Fresh questions on any topic, generated as you play.',
                    prompt:
                        'Build a trivia quiz where I type a topic and the game uses AI to generate ten multiple-choice questions about it, one at a time, with a 15-second timer per question, instant feedback, and a final score screen. Save my past topics and scores to my Puter account so I can see how I improve.',
                },
                {
                    title: 'Idle bakery',
                    body: 'A clicker with upgrades and progress that keeps going.',
                    prompt:
                        'Build an idle clicker game where I tap to bake bread, earn coins, and buy upgrades like ovens and bakers that produce automatically. Show income per second, make upgrade prices rise each purchase, add a prestige reset that grants a permanent multiplier, and save my progress to my Puter account so the bakery is exactly where I left it.',
                },
                {
                    title: 'Arcade with a leaderboard',
                    body: 'Breakout-style bricks and a global top-ten everyone shares.',
                    prompt:
                        'Build a breakout game with a paddle, a ball, and rows of colored bricks worth different points, with a few power-ups like a wider paddle and a multi-ball. Add three levels of increasing difficulty and a global top-ten leaderboard stored in a Puter serverless worker so every player sees the same scores, entering a name when they make the list.',
                },
            ],
        },

        {
            type: 'grid',
            id: 'beyond-single-player',
            columns: 2,
            heading: 'More than a single-player toy',
            intro:
                'Most AI game makers stop at a share link. Every game built with Puter AI Builder runs on [Puter](' + LINKS.puter + '), so the backend is already there and your game can grow the moment you want it to.',
            items: [
                {
                    icon: 'users',
                    title: 'Saves, leaderboards, and multiplayer',
                    body:
                        'Players sign in with their own Puter account and their progress is stored under it, so a save is never lost. A shared high-score table can live in a serverless worker so everyone sees the same list, and real-time head-to-head play uses Puter\'s peer-to-peer API with no game server for you to run. Anything players use is covered by their own account ([how it works](' + LINKS.userPays + ')).',
                },
                {
                    icon: 'sparkles',
                    title: 'AI inside the game',
                    body:
                        'A character that talks back, a quiz that writes its own questions, a level description that changes every run, a background or sprite generated from a prompt. Your game can use chat, vision, and image models directly through Puter, with no API keys to manage and no AI bill for you to carry.',
                },
            ],
        },

        {
            type: 'faq',
            id: 'faq',
            heading: 'AI game builder FAQ',
            items: [
                {
                    q: 'What is an AI game builder, and how does it work?',
                    a: [
                        'An AI game builder turns a plain-language description into a playable game. You say what the game is, how the player moves, how they score, and how they lose, and the AI writes the code, runs it, and shows it to you so you can play it right away.',
                        'You don\'t need to know how to code. Every step, from the first description to publishing, works in plain English, and you tune the game the same way, by asking for changes or clicking the part you want changed. Hosting, player accounts, and saved data are included, so there is nothing to set up or maintain.',
                        'Games built with Puter AI Builder are browser games: standard HTML, CSS, and JavaScript that run on any phone or desktop from a link. That makes them easy to share and easy to take with you, and it also sets the boundary of what the tool is for. It is not a replacement for a 3D engine or a console pipeline.',
                    ],
                },
                {
                    q: 'Do I need to know how to code?',
                    a: [
                        'No. You describe the game and refine it in plain language. If you can code, you are free to read the files and edit them, and the builder will keep working alongside your changes, but nothing requires it.',
                    ],
                },
                {
                    q: 'What kinds of games can I make?',
                    a: [
                        'Anything that runs well in a browser: arcade games, platformers, puzzle games, word and number games, quizzes and trivia, card and board games, idle and clicker games, text adventures, visual novels, and quick party games you play with friends on the same screen or over a link.',
                        'Because a backend is included, those games can also have accounts, saved progress, shared leaderboards, AI-driven characters, and real-time multiplayer without any server of your own.',
                    ],
                },
                {
                    q: 'Can AI really make a full game from a prompt?',
                    a: [
                        'It makes a complete, playable game from a prompt: mechanics, controls, scoring, screens, and a restart, usually in a couple of minutes. Whether that first version is fun is a different question, and it is the one you are there for. Treat the first build as a strong draft, then tune it: speed, difficulty, feel, and look, one change at a time.',
                        'Puter AI Builder is made for that loop. Every change is run and checked before you see it, every version is saved so a bad idea costs nothing to undo, and you can point at the exact thing you want changed instead of describing it.',
                    ],
                },
                {
                    q: 'Is it free to use?',
                    a: [
                        'Yes. Building and publishing are free with a [Puter](' + LINKS.puter + ') account, and no card is required. Open Puter AI Builder, describe a game, and play it in the preview right away. Nothing is public until you decide to publish.',
                        'There is no credit meter that a failed attempt eats into. Very heavy use can hit the free tier\'s limits, at which point you can upgrade your Puter account. Ordinary building, tuning, and publishing do not.',
                    ],
                },
                {
                    q: 'How much does it cost to run the game once people are playing it?',
                    a: [
                        'Nothing. Hosting is included, and anything players use, like saved progress or AI features, is covered by their own [Puter](' + LINKS.puter + ') account. If your game goes viral, you don\'t get a surprise bill. [How it works](' + LINKS.userPays + ').',
                    ],
                },
                {
                    q: 'Can I make money with my games?',
                    a: [
                        'Yes. The game is yours, and there is no commission and no commercial-rights tier to unlock. Puter AI Builder does not process payments itself, so the usual approach is to link to a payment provider you already use, such as a checkout page or a payment link, and let the game handle everything around it: sign-in, unlocked content, and per-player data. Ads and sponsorships work the way they would on any web page you own.',
                    ],
                },
                {
                    q: 'Do I own the games I make? Can I export them?',
                    a: [
                        'Yes. The code, the design, and everything you publish are yours. There is no license to renew and no export wall. Keep the game on [Puter](' + LINKS.puter + ') or take it somewhere else at any time.',
                        'The project is a normal folder of files, and you can download the whole thing as a zip whenever you like. Because the output is standard HTML, CSS, and JavaScript with no build step, it runs on any static host or straight off your disk, and a developer can keep working on it in an ordinary editor.',
                    ],
                },
                {
                    q: 'Can it make 3D games, or Unity and Unreal projects?',
                    a: [
                        'No. Puter AI Builder produces browser games built with standard web technology, which is a natural fit for 2D games and interface-driven games and a poor fit for a full 3D production. It does not produce Unity, Unreal, or Godot projects, console builds, or anything that needs a game engine\'s editor. If you are shipping to Steam or a console, a game engine with an AI assistant is the right tool, and this one is not.',
                    ],
                },
                {
                    q: 'Does it generate art and sound?',
                    a: [
                        'Partly. Your game can use Puter\'s image generation models, so a background, an icon, or a sprite can be generated from a prompt, and the builder can draw simple shapes and animations directly in code. You can also attach your own images and a logo in the chat and they are saved into the project.',
                        'It does not generate music or sound effect files. Simple sounds can be synthesized in code if you ask for them, and for anything more you should plan on bringing your own audio.',
                    ],
                },
                {
                    q: 'Can I add multiplayer or a leaderboard?',
                    a: [
                        'Yes. A shared leaderboard can live in a Puter serverless worker, deployed from the same conversation, so every player sees the same list. Real-time head-to-head play between devices uses Puter\'s peer-to-peer API, with no game server for you to run or pay for.',
                        'Balance, matchmaking rules, and anti-cheat are still design work. The builder writes what you ask for, and you decide what is fair.',
                    ],
                },
                {
                    q: 'Will it work on phones? Can I put it on the App Store or Steam?',
                    a: [
                        'Every game works on phones and desktops from the same link, with touch controls as you ask for them. On a phone it can be added to the home screen with its own icon and launched full screen, so it opens and feels like a native app, with no store review, no fees, and updates that go live for everyone instantly.',
                        'It does not produce App Store, Google Play, Steam, or console builds. If a store listing is the goal, export the files and wrap them with a tool made for that; the game itself will come with you.',
                    ],
                },
                {
                    q: 'Can I build from my phone?',
                    a: [
                        'Yes. Puter AI Builder is fully usable on a phone, with the chat and the preview as two views you switch between, so you can build a game and play-test it on the same device. Long builds keep running while the screen is on, and a build interrupted by the browser suspending the tab picks back up when you return.',
                    ],
                },
                {
                    q: 'What happens when the AI gets something wrong?',
                    a: [
                        'Most runtime errors are caught before you see them: Puter AI Builder reloads the preview after each change, watches for errors, and sends them back to the AI to fix and re-verify.',
                        'For everything else, tell it what is wrong in one sentence, or click the offending element in the preview and describe the fix. If a change made the game worse overall, version history lets you restore an earlier snapshot and take a different run at it.',
                    ],
                },
                {
                    q: 'Can I use it for teaching or with students?',
                    a: [
                        'Yes. It runs in any modern browser with nothing to install, building is free, and the result is readable code, which makes it a good way to show how a game is put together. Each student builds from their own [Puter](' + LINKS.puter + ') account, and anything they publish is theirs.',
                    ],
                },
            ],
        },

        {
            type: 'cta',
            heading: 'Turn your idea into a playable game',
            body: 'Build it with AI, no coding required. Free to start, hosting and backend included.',
            label: 'Start building',
            href: buildLink(''),
        },
    ],

    related: ['use-cases', 'ai-app-builder', 'ai-website-builder', 'guides/how-to-write-a-build-prompt'],
};
