import { verticalPage } from '../verticals.js';

export default verticalPage({
    slug: 'tutors',
    navLabel: 'Tutors',

    title: 'App and Website Builder for Tutors and Teachers | Puter',
    description:
        'Student portals, practice quiz apps, flashcard makers, and a tutoring site parents trust. Describe the tool in plain English and it is built and published free.',
    ogTagline: 'Teaching tools, built by describing them',

    eyebrow: 'For tutors',
    h1: 'Build the practice tools your students actually need',
    lead:
        'Off-the-shelf education apps teach their curriculum, not yours. Describe the tool you wish existed, in plain English, and get it: a quiz app with your questions, a student portal with your assignments, a site that convinces parents you know what you are doing. Because you built it.',

    demo: {
        prompt: 'Build a study portal where my students take the practice quizzes I create',
        app: {
            name: 'brightpath.puter.site',
            header: 'Students',
            blocks: [
                {
                    kind: 'stats',
                    items: [
                        { value: '16', label: 'Active students' },
                        { value: '42', label: 'Quizzes taken' },
                        { value: '87%', label: 'Average score' },
                    ],
                },
                {
                    kind: 'bars',
                    label: 'Scores this week',
                    values: [55, 70, 62, 84, 78, 91, 88],
                },
            ],
        },
    },

    useCasesHeading: 'What tutors and teachers build here',
    useCasesIntro:
        'Tools shaped by your subject, your methods, and your students, not by an edtech product manager\'s average of everyone\'s.',
    useCases: [
        {
            icon: 'book',
            title: 'A student practice portal',
            body:
                'Students sign in, work through the quizzes and exercises you created, and see their own progress. You see who practiced, who struggled, and with what.',
        },
        {
            icon: 'sparkles',
            title: 'Quiz and flashcard generators',
            body:
                'Paste your notes or a chapter, and the app you built drafts questions and cards with AI, in your format, for you to edit and approve. Prep time collapses.',
        },
        {
            icon: 'chart',
            title: 'Progress reports parents understand',
            body:
                'Scores over time, topics mastered, topics pending: a per-student view that turns "how is she doing?" into a chart instead of a recollection.',
        },
        {
            icon: 'calendar',
            title: 'Session scheduling',
            body:
                'Your available slots, their bookings, and rescheduling that does not happen over four text messages. Built around your hours and your cancellation rules.',
        },
        {
            icon: 'layout',
            title: 'A tutoring site parents trust',
            body:
                'Your subjects, your approach, your results, your rates, and a clear inquiry form. Parents are making a considered purchase; the site should read like you teach.',
        },
        {
            icon: 'zap',
            title: 'Classroom mini-tools',
            body:
                'A random name picker, a timed reading tracker, a fraction visualizer for Thursday\'s lesson: single-purpose tools built in minutes, disposable or keepable.',
        },
    ],

    splitHeading: 'You write the lesson plan. This builds the software.',
    splits: [
        {
            title: 'Describe it like an assignment brief',
            art: 'describe',
            body: [
                'You spend your working life turning fuzzy goals into precise instructions; this is that skill, pointed at software. "Ten-question algebra quiz, one attempt per day, instant feedback, wrong answers explained" is a complete build request.',
                'The app takes shape in a live preview, and you adjust it the way you would mark a draft.',
            ],
        },
        {
            title: 'AI inside the tools, on your terms',
            art: 'backend',
            body: [
                'Apps built here can call AI models themselves: generate practice questions from your material, adapt difficulty to a student\'s recent scores, explain a wrong answer step by step.',
                'You decide where AI helps and where it stays out. It drafts, you approve; your standards remain the product.',
            ],
        },
        {
            title: 'Works on the device the student actually has',
            art: 'devices',
            body: [
                'Homework happens on phones, hand-me-down laptops, and school tablets. Everything built here is a lightweight web page that runs on all of them from one link, no installs and no app store approvals.',
                'Students can pin it to a home screen, where it behaves like an app with your name on it.',
            ],
        },
    ],

    promptsHeading: 'Prompts to teach from',
    prompts: [
        {
            title: 'Practice quiz portal',
            body: 'Your question bank, student logins, and a results view.',
            prompt:
                'Build a practice quiz portal for my math tutoring students. I sign in as the tutor and create quizzes with multiple-choice and short-answer questions, each with an explanation shown after answering. Students sign in with their own accounts, take assigned quizzes with instant feedback, and see their score history. Show me a dashboard of every student\'s attempts and average by topic. Save everything to my Puter account.',
        },
        {
            title: 'AI flashcard maker',
            body: 'Notes in, editable decks out, with spaced review.',
            prompt:
                'Build a flashcard app for my students where I paste study notes and it uses AI to draft a deck of question-and-answer cards that I can edit before saving. Students flip through decks, mark cards they got wrong, and review missed cards more often. Track per-deck progress and keep all decks saved between visits.',
        },
        {
            title: 'Student progress reports',
            body: 'Per-student scores, topics, and a parent-ready view.',
            prompt:
                'Build a progress tracker for my tutoring practice. I add students with a subject, log each session with a date, topics covered, and a score or note, and mark topics as introduced, practicing, or mastered. Each student gets a clean report page with a score chart over time and a topic checklist that I can share with parents. Save everything to my Puter account.',
        },
        {
            title: 'Tutoring website',
            body: 'Subjects, approach, results, rates, and inquiries.',
            prompt:
                'Build a website for my tutoring practice. Sections: who I help (middle and high school math), how I teach in three short points, results and parent testimonials I will fill in, rates with a package option, an about section with my background, and an inquiry form asking for the student\'s grade level and goals that saves submissions for me. Warm, credible design that reassures parents.',
        },
    ],

    faqHeading: 'Questions from the staff room',
    faq: [
        {
            q: 'Do my students need accounts? What about younger ones?',
            a: [
                'Tools that track per-student progress use free Puter accounts, so each student\'s work is saved under their own login. Tools that do not need saving, like a practice quiz without history or a classroom timer, work from a bare link with no sign-in at all. You choose per tool.',
            ],
        },
        {
            q: 'Can I trust AI-generated questions with my students?',
            a: [
                'Trust it the way you trust a student teacher: useful drafts, your review required. The pattern that works is AI drafts, tutor edits, students see only what you approved. The apps you build here can enforce exactly that flow, which off-the-shelf AI study tools usually do not.',
            ],
        },
        {
            q: 'Is this free enough for a teacher\'s budget?',
            a: [
                'Yes, genuinely: building, publishing, and using the tools are free with a Puter account, and there is no per-student pricing. The economics that make edtech subscriptions impossible for one classroom are the reason this page exists.',
            ],
        },
        {
            q: 'I teach a niche subject. Will it handle unusual formats?',
            a: [
                'Niche is where describing beats configuring. A conjugation drill for Portuguese, a music interval trainer, a chemistry equation balancer: if you can describe the exercise format precisely, it can be built, and no template marketplace had it anyway.',
            ],
        },
    ],

    ctaHeading: 'Describe the tool your students need this week',
    ctaBody: 'One assignment-brief of a sentence is enough to see it working.',

    related: ['for', 'for/personal-trainers', 'for/therapists', 'what-to-build'],
});
