import fs from 'node:fs';

// ---- Generated media (GenerateImage / GenerateVideo / GenerateSpeech) -------
// The real src/js/media.js and the tools under src/tools/media/ run here
// against stubbed puter.ai / puter.fs and stubbed card hooks (media.js routes
// its UI calls through window.GeneratedMedia so they can be replaced; the DOM
// side is exercised in the browser). Asserts:
//   1. files land in the chat's media folder, OUTSIDE the project (so version
//      snapshots never copy them and restores never delete them)
//   2. save_to_project copies into the project and counts as a project change
//      (version history + preview verification); a path outside is refused
//      before anything is generated or spent
//   3. reference images may come from the project or this chat's media folder
//      only
//   4. failures, a Stop and a chat switch never leave a "Generating…" card
//   5. the provider options (ratio, quality, size, seconds) are what the
//      Puter docs expect; test mode reaches the provider
//   6. wiring: bundle order, loadChat re-render, delete/duplicate handling

let failures = 0;
function check(name, cond, extra) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : '')); failures++; }
}
const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');

const helpersSrc = read('../src/js/helpers.js');
const mediaSrc = read('../src/js/media.js');
const imageSrc = read('../src/tools/media/generate_image.js');
const videoSrc = read('../src/tools/media/generate_video.js');
const speechSrc = read('../src/tools/media/generate_speech.js');
const appSrc = read('../src/js/app.js');
const viteSrc = read('../vite.config.js');

const ROOT = '/u/AppData/app/chat1';
const MEDIA = '/u/AppData/app/.media/chat1';

// ---- Environment ------------------------------------------------------------
function makeEnv({ stale = false, testMode = false } = {}) {
    const calls = { txt2img: [], txt2vid: [], txt2speech: [], grids: [], frames: [], appended: [], copy: [], mkdir: [], marked: [], recorded: [], cards: [], filled: [], removed: [], saved: [], tracked: [] };
    const win = { tools: [], FEATURE_FLAGS: {} };
    // Path helpers: the real block from helpers.js.
    const a = helpersSrc.indexOf('window.normalizePosixPath =');
    const b = helpersSrc.indexOf('// ---- Per-path file-write serialization');
    new Function('window', helpersSrc.slice(a, b))(win);
    win.isAborted = (ctrl) => !!(ctrl && ctrl.signal && ctrl.signal.aborted);
    win.isStaleTurn = () => env.stale;
    win.withFileLock = (p, fn) => Promise.resolve().then(fn);
    win.markProjectModified = (tool, chatId) => calls.marked.push([tool, chatId]);
    win.recordPreviewChange = (p) => calls.recorded.push(p);
    win.schedulePreviewRefresh = () => {};
    win.track = (ev, props) => calls.tracked.push([ev, props]);
    const env = {
        win, calls, stale,
        existing: new Set(),     // paths puter.fs.stat finds
        saveOnGenerate: true,    // the provider honours puter_output_path
        generateImpl: null,      // override the provider
        src: 'https://provider.example/tmp.png',
    };
    const puter = {
        ai: {
            txt2img: async (prompt, options) => {
                calls.txt2img.push({ prompt, options });
                if (env.generateImpl) return env.generateImpl(prompt, options);
                if (env.saveOnGenerate) env.existing.add(options.puter_output_path);
                return { src: env.src };
            },
            txt2speech: async (text, options) => {
                calls.txt2speech.push({ text, options });
                if (env.generateImpl) return env.generateImpl(text, options);
                return { src: 'blob:http://localhost/speech-1' };
            },
            txt2vid: async (prompt, options) => {
                calls.txt2vid.push({ prompt, options });
                if (env.generateImpl) return env.generateImpl(prompt, options);
                if (env.saveOnGenerate) env.existing.add(options.puter_output_path);
                return { src: 'https://provider.example/tmp.mp4', toString() { return this.src; } };
            },
        },
        fs: {
            mkdir: async (p) => { calls.mkdir.push(p); },
            stat: async (p) => { if (!env.existing.has(p)) { const e = new Error('not found'); e.code = 'subject_does_not_exist'; throw e; } return { path: p }; },
            copy: async (src, dest, opts) => { calls.copy.push([src, dest, opts]); },
            getReadURL: async (p) => 'https://read.example' + p,
            read: async () => { throw new Error('no reads in this test'); },
        },
    };
    // A $ good enough for media.js's load-time `$(document).on(...)`.
    const chain = new Proxy(function () {}, { get: () => () => chain, apply: () => chain });
    const $ = () => chain;
    const localStorage = { getItem: (k) => (k === 'debugMediaTestMode' && testMode ? '1' : null) };
    const document = { contains: () => true, addEventListener() {}, querySelectorAll: () => [] };
    const run = (src) => new Function('window', 'puter', '$', 'localStorage', 'document', 'console',
        src.replace(/\bwindow\.tools\.push\(/g, 'window.tools.push('))(win, puter, $, localStorage, document,
        { log() {}, warn() {}, error() {} });
    run(mediaSrc);
    // Stub the card hooks (the DOM half).
    const GM = win.GeneratedMedia;
    GM.pendingCard = (o) => { const c = { id: calls.cards.length, ...o }; calls.cards.push(c); return c; };
    GM.appendToChat = (n) => calls.appended.push(n);
    GM.gridMessage = ({ count }) => {
        const tiles = Array.from({ length: count }, (_, i) => ({ id: 'tile' + i, tile: true }));
        calls.grids.push(count);
        return { $msg: { grid: true }, tiles };
    };
    GM.videoFrameDataURL = async (p) => { calls.frames.push(p); if (env.frameFail) throw new Error('decode failed'); return { dataURL: 'data:image/jpeg;base64,AAA', width: 720, height: 1280 }; };
    GM.onPage = () => true;
    GM.fillCard = (c, o) => calls.filled.push([c.id, o]);
    GM.removeCard = (c) => { if (c) calls.removed.push(c.id); };
    GM.saveFromSrc = async (src, p) => { calls.saved.push([src, p]); env.existing.add(p); };
    GM.imageDataURL = async (p) => 'data:image/png;base64,' + Buffer.from(p).toString('base64');
    run(imageSrc);
    run(videoSrc);
    run(speechSrc);
    env.tool = (name) => win.tools.find(t => t.function.name === name);
    env.state = () => ({ appDir: ROOT, currentChatId: 'chat1', abortController: new AbortController() });
    return env;
}

async function rejects(p) { try { await p; return null; } catch (e) { return e; } }

// ---- 1. Registration --------------------------------------------------------
{
    const env = makeEnv();
    const img = env.tool('GenerateImage');
    const vid = env.tool('GenerateVideo');
    check('GenerateImage is registered with a required prompt', !!img && img.function.parameters.required.join() === 'prompt');
    check('GenerateVideo is registered with a required prompt', !!vid && vid.function.parameters.required.join() === 'prompt');
    check('the media folder sits beside the project, not in it', env.win.chatMediaDir({ appDir: ROOT }) === MEDIA);
}

// ---- 2. An image: saved to the media folder, shown in the chat -------------
{
    const env = makeEnv();
    const r = await env.tool('GenerateImage').exec({ prompt: 'A red fox in the snow', aspect_ratio: '16:9' }, env.state());
    const call = env.calls.txt2img[0];
    check('the provider gets the prompt', call && call.prompt === 'A red fox in the snow');
    check('…saves straight into this chat\'s media folder', call && call.options.puter_output_path.startsWith(MEDIA + '/image_'));
    check('…with the ratio as { w, h }', call && call.options.ratio && call.options.ratio.w === 16 && call.options.ratio.h === 9);
    check('…at medium quality by default', call && call.options.quality === 'medium');
    check('…and not in test mode', call && !('test_mode' in call.options));
    check('the result points at the saved file', r.success && r.kind === 'image' && r.path === call.options.puter_output_path && /\.png$/.test(r.filename));
    check('…marked for loadChat to show again', r.__generated_media === true && r.prompt === 'A red fox in the snow' && r.aspect_ratio === '16:9');
    check('…and tells the model not to repeat a link', /Do not repeat its path/.test(r.note));
    check('a pending card was shown, then filled with a read URL',
        env.calls.cards.length === 1 && env.calls.filled.length === 1 && env.calls.filled[0][1].url === 'https://read.example' + r.path);
    check('nothing touched the project (no version-history change)', env.calls.marked.length === 0 && env.calls.copy.length === 0 && env.calls.recorded.length === 0);
}

// ---- 3. save_to_project ---------------------------------------------------
{
    const env = makeEnv();
    const r = await env.tool('GenerateImage').exec({ prompt: 'Hero photo', save_to_project: 'assets/hero' }, env.state());
    const [src, dest, opts] = env.calls.copy[0] || [];
    check('save_to_project copies the saved file into the project', src === r.path && dest === ROOT + '/assets' && opts && opts.newName === 'hero.png' && opts.overwrite === true);
    check('…adding .png to a name without an image extension', r.project_path === ROOT + '/assets/hero.png' && r.relative_path === 'assets/hero.png');
    check('…counts as a project change for version history', env.calls.marked.length === 1 && env.calls.marked[0][0] === undefined && env.calls.marked[0][1] === 'chat1');
    check('…and for the preview\'s change verification', env.calls.recorded.join() === ROOT + '/assets/hero.png');
    check('…and the model is told the relative path to use', /assets\/hero\.png/.test(r.note));
}
{
    const env = makeEnv();
    const err = await rejects(env.tool('GenerateImage').exec({ prompt: 'x', save_to_project: '/u/AppData/app/chat2/assets/a.png' }, env.state()));
    check('save_to_project outside the project is refused', !!err && /outside this project/.test(err.message));
    check('…before anything is generated (no credits spent)', env.calls.txt2img.length === 0 && env.calls.cards.length === 0);
}
{
    // The project folder itself resolved inside the sandbox, and the appended
    // extension then named a sibling of the project: /u/AppData/app/chat1.png.
    for (const [tool, args] of [
        ['GenerateImage', { prompt: 'x', save_to_project: '.' }],
        ['GenerateImage', { prompt: 'x', save_to_project: 'assets/..', count: 2 }],
        ['GenerateImage', { prompt: 'x', save_to_project: ROOT }],
        ['GenerateSpeech', { text: 'hello', save_to_project: '.' }],
    ]) {
        const env = makeEnv();
        const err = await rejects(env.tool(tool).exec(args, env.state()));
        check(`${tool} refuses save_to_project ${JSON.stringify(args.save_to_project)} (the project folder itself)`,
            !!err && /file path inside the project/.test(err.message) && env.calls.copy.length === 0, err && err.message);
    }
}

// ---- 4. Reference images ---------------------------------------------------
{
    const env = makeEnv();
    await env.tool('GenerateImage').exec({ prompt: 'Make it night', input_images: [MEDIA + '/image_1.png', 'assets/me.jpg'] }, env.state());
    const imgs = env.calls.txt2img[0] && env.calls.txt2img[0].options.input_images;
    check('reference images from the media folder and the project are sent as data URIs',
        Array.isArray(imgs) && imgs.length === 2 && imgs.every(u => u.startsWith('data:image/')));
}
{
    const env = makeEnv();
    const err = await rejects(env.tool('GenerateImage').exec({ prompt: 'x', input_images: ['/u/AppData/app/.media/chat2/secret.png'] }, env.state()));
    check('a reference image from ANOTHER chat is refused', !!err && env.calls.txt2img.length === 0);
    const err2 = await rejects(env.tool('GenerateImage').exec({ prompt: 'x', input_images: ['a.png', 'b.png', 'c.png', 'd.png', 'e.png'] }, env.state()));
    check('more than 4 reference images are refused', !!err2 && /At most 4/.test(err2.message));
}

// ---- 5. Failures never leave a "Generating…" card --------------------------
{
    const env = makeEnv();
    env.generateImpl = async () => { const e = new Error('blocked'); e.code = 'bad_request'; e.errorCode = 'moderation_flagged'; throw e; };
    const err = await rejects(env.tool('GenerateImage').exec({ prompt: 'x' }, env.state()));
    check('a content-filter refusal becomes a plain instruction for the model', !!err && /content filter/.test(err.message) && /do not retry/i.test(err.message));
    check('…and the pending card is taken down', env.calls.removed.length === 1 && env.calls.filled.length === 0);
}
{
    const env = makeEnv();
    env.generateImpl = async () => { const e = new Error('Not enough'); e.code = 'insufficient_funds'; throw e; };
    const err = await rejects(env.tool('GenerateVideo').exec({ prompt: 'x' }, env.state()));
    check('out of credits says so', !!err && /enough Puter credits/.test(err.message));
}
{
    const env = makeEnv();
    env.saveOnGenerate = false;
    const r = await env.tool('GenerateImage').exec({ prompt: 'x' }, env.state());
    check('when the provider did not save the file, it is saved from the returned URL',
        env.calls.saved.length === 1 && env.calls.saved[0][0] === env.src && r.path === env.calls.saved[0][1]);
}
{
    const env = makeEnv();
    env.generateImpl = async () => ({ src: '' });
    const err = await rejects(env.tool('GenerateImage').exec({ prompt: 'x' }, env.state()));
    check('an empty result is an error, not a phantom image', !!err && env.calls.removed.length === 1 && env.calls.filled.length === 0);
}
{
    const env = makeEnv();
    const state = env.state();
    env.generateImpl = async (p, options) => { state.abortController.abort(); env.existing.add(options.puter_output_path); return { src: env.src }; };
    const r = await env.tool('GenerateImage').exec({ prompt: 'x' }, state);
    check('Stop during generation takes the card down and never fills it',
        env.calls.removed.length >= 1 && env.calls.filled.length === 0);
    check('…the file is still saved for the history', r.success && !!r.path);
}
{
    const env = makeEnv({ stale: true });
    await env.tool('GenerateImage').exec({ prompt: 'x' }, env.state());
    check('a turn whose chat is no longer open shows no card at all', env.calls.cards.length === 0 && env.calls.filled.length === 0);
}

// ---- 6. Video options ------------------------------------------------------
{
    const env = makeEnv();
    const r = await env.tool('GenerateVideo').exec({ prompt: 'Waves', aspect_ratio: '9:16', seconds: 50, input_image: 'assets/beach.png' }, env.state());
    const o = env.calls.txt2vid[0] && env.calls.txt2vid[0].options;
    check('video: a vertical clip asks for 720x1280', o && o.size === '720x1280');
    check('video: seconds are clamped to 10', o && o.seconds === 10);
    check('video: the start image is sent as input_reference', o && /^data:image\//.test(o.input_reference));
    check('video: a clip from an image uses the image-to-video model (the default model is text-only)', o && o.model === 'togetherai:wan-ai/wan2.7-i2v');
    check('video: saved as an .mp4 in the media folder', r.kind === 'video' && r.path.startsWith(MEDIA + '/video_') && /\.mp4$/.test(r.filename));
}
{
    const env = makeEnv();
    await env.tool('GenerateVideo').exec({ prompt: 'Waves' }, env.state());
    const o = env.calls.txt2vid[0].options;
    check('video defaults: 5 seconds, 16:9', o.seconds === 5 && o.size === '1280x720');
    check('video: a text-only clip leaves the model to Puter\'s default', !('model' in o));
    await env.tool('GenerateVideo').exec({ prompt: 'Waves', seconds: 0.2 }, env.state());
    check('video: too-short clips are raised to 2 seconds', env.calls.txt2vid[1].options.seconds === 2);
}
{
    const env = makeEnv({ testMode: true });
    await env.tool('GenerateImage').exec({ prompt: 'x' }, env.state());
    check('localStorage.debugMediaTestMode reaches the provider as test_mode', env.calls.txt2img[0].options.test_mode === true);
}

// ---- 7. Speech --------------------------------------------------------------
{
    const env = makeEnv();
    check('GenerateSpeech is registered with required text', env.tool('GenerateSpeech')?.function.parameters.required.join() === 'text');
    const r = await env.tool('GenerateSpeech').exec({ text: 'Hello there.', voice: 'nova', instructions: 'warm and calm' }, env.state());
    const c = env.calls.txt2speech[0];
    check('speech: the exact text is spoken', c && c.text === 'Hello there.');
    check('speech: OpenAI gpt-4o-mini-tts as mp3, with the chosen voice and delivery',
        c && c.options.provider === 'openai' && c.options.model === 'gpt-4o-mini-tts' && c.options.voice === 'nova'
        && c.options.response_format === 'mp3' && c.options.instructions === 'warm and calm');
    check('speech: no puter_output_path (txt2speech has none)', c && !('puter_output_path' in c.options));
    check('speech: always saved from the returned URL, into the media folder',
        env.calls.saved.length === 1 && env.calls.saved[0][0] === 'blob:http://localhost/speech-1' && r.path === env.calls.saved[0][1]
        && r.path.startsWith(MEDIA + '/audio_') && /\.mp3$/.test(r.filename));
    check('speech: the result is an audio card that keeps its voice', r.kind === 'audio' && r.voice === 'nova' && r.instructions === 'warm and calm' && r.prompt === 'Hello there.');
    check('speech: the card was filled', env.calls.filled.length === 1 && env.calls.filled[0][1].kind === 'audio');
}
{
    const env = makeEnv();
    await env.tool('GenerateSpeech').exec({ text: 'Hi', voice: 'not-a-voice' }, env.state());
    const o = env.calls.txt2speech[0].options;
    check('speech: an unknown voice falls back to alloy, and no empty instructions are sent', o.voice === 'alloy' && !('instructions' in o));
    const err = await rejects(env.tool('GenerateSpeech').exec({ text: 'x'.repeat(3001) }, env.state()));
    check('speech: text over 3,000 characters is refused before any call, with advice to split',
        !!err && /Split it/.test(err.message) && env.calls.txt2speech.length === 1);
}
{
    const env = makeEnv();
    const r = await env.tool('GenerateSpeech').exec({ text: 'Welcome', save_to_project: 'assets/intro.wav' }, env.state());
    check('speech: save_to_project copies the clip in as .mp3', r.project_path === ROOT + '/assets/intro.mp3' && env.calls.copy[0]?.[2]?.newName === 'intro.mp3'
        && env.calls.marked.length === 1);
}
{
    const env = makeEnv({ testMode: true });
    await env.tool('GenerateSpeech').exec({ text: 'Hi' }, env.state());
    check('speech: test mode reaches the provider', env.calls.txt2speech[0].options.test_mode === true);
}

// ---- 8. Several images in one call ----------------------------------------
{
    const env = makeEnv();
    const r = await env.tool('GenerateImage').exec({ prompt: 'A cozy cabin', count: 3, aspect_ratio: '1:1' }, env.state());
    check('count: one grid of 3 tiles, generated in parallel', env.calls.grids.join() === '3' && env.calls.txt2img.length === 3);
    check('count: each tile is filled in place', env.calls.filled.map(f => f[0]).sort().join() === 'tile0,tile1,tile2' && env.calls.cards.length === 0);
    check('count: the result lists every version (first one as its own path)',
        r.count === 3 && r.items.length === 3 && r.items.every(it => it.path.startsWith(MEDIA + '/image_')) && r.path === r.items[0].path);
    check('count: the model is told which path is which', /1\) \//.test(r.note) && /3\) \//.test(r.note));
}
{
    const env = makeEnv();
    let n = 0;
    env.generateImpl = async (p, options) => { if (n++ === 1) { const e = new Error('x'); e.code = 'upstream_failed'; throw e; } env.existing.add(options.puter_output_path); return { src: env.src }; };
    const r = await env.tool('GenerateImage').exec({ prompt: 'x', count: 3 }, env.state());
    check('count: a failed version drops its tile; the rest still land', r.count === 2 && env.calls.removed.join() === 'tile1' && /1 more failed/.test(r.note));
}
{
    const env = makeEnv();
    env.generateImpl = async () => { const e = new Error('x'); e.code = 'insufficient_funds'; throw e; };
    const err = await rejects(env.tool('GenerateImage').exec({ prompt: 'x', count: 2 }, env.state()));
    check('count: if every version fails, the error surfaces', !!err && /enough Puter credits/.test(err.message));
}
{
    const env = makeEnv();
    const r = await env.tool('GenerateImage').exec({ prompt: 'x', count: 2, save_to_project: 'assets/hero.png' }, env.state());
    check('count + save_to_project: numbered project files', r.items.map(i => i.relative_path).join() === 'assets/hero-1.png,assets/hero-2.png');
    const r9 = await env.tool('GenerateImage').exec({ prompt: 'x', count: 9 }, env.state());
    check('count is capped at 4', r9.count === 4);
}

// ---- 9. Video: sound and continuing a clip --------------------------------
{
    const env = makeEnv();
    await env.tool('GenerateVideo').exec({ prompt: 'Waves' }, env.state());
    await env.tool('GenerateVideo').exec({ prompt: 'Waves', with_sound: false }, env.state());
    check('video: a soundtrack by default, silent on request', env.calls.txt2vid[0].options.generate_audio === true && env.calls.txt2vid[1].options.generate_audio === false);
}
{
    const env = makeEnv();
    const r = await env.tool('GenerateVideo').exec({ prompt: 'The boat sails on', continue_from: MEDIA + '/video_1.mp4' }, env.state());
    const o = env.calls.txt2vid[0].options;
    check('continue_from: the last frame of that clip starts the new one', env.calls.frames.join() === MEDIA + '/video_1.mp4' && o.input_reference === 'data:image/jpeg;base64,AAA');
    check('continue_from: uses the image-to-video model', o.model === 'togetherai:wan-ai/wan2.7-i2v');
    check('continue_from: keeps the original\'s (portrait) shape', o.size === '720x1280' && r.aspect_ratio === '9:16');
    check('continue_from: recorded in the result', r.continued_from === MEDIA + '/video_1.mp4');
}
{
    // Animating a photo without an aspect ratio keeps the photo's shape, as
    // continue_from keeps the clip's: it always asked for 16:9 (1280x720), so
    // a portrait photo came back squeezed or cropped into landscape.
    const env = makeEnv();
    env.win.GeneratedMedia.imageDataURL = async (p, opts) => {
        const dataURL = 'data:image/jpeg;base64,BBB';
        return opts && opts.withSize ? { dataURL, width: 1536, height: 2048 } : dataURL;
    };
    const r = await env.tool('GenerateVideo').exec({ prompt: 'She waves', input_image: 'assets/portrait.jpg' }, env.state());
    const o = env.calls.txt2vid[0].options;
    check('input_image: a portrait photo without aspect_ratio gets a portrait clip', o.size === '720x960' && r.aspect_ratio === '3:4', [o.size, r.aspect_ratio]);
    check('input_image: still sent as the start frame', o.input_reference === 'data:image/jpeg;base64,BBB');
    await env.tool('GenerateVideo').exec({ prompt: 'She waves', input_image: 'assets/portrait.jpg', aspect_ratio: '16:9' }, env.state());
    check('input_image: an aspect_ratio that was asked for still wins', env.calls.txt2vid[1].options.size === '1280x720');
}
{
    const env = makeEnv();
    const e1 = await rejects(env.tool('GenerateVideo').exec({ prompt: 'x', continue_from: 'assets/a.mp4', input_image: 'assets/a.png' }, env.state()));
    check('continue_from and input_image together are refused', !!e1 && /not both/.test(e1.message) && env.calls.txt2vid.length === 0);
    const e2 = await rejects(env.tool('GenerateVideo').exec({ prompt: 'x', continue_from: 'assets/a.png' }, env.state()));
    check('continue_from must be a video', !!e2 && /not a video/.test(e2.message));
    env.frameFail = true;
    const e3 = await rejects(env.tool('GenerateVideo').exec({ prompt: 'x', continue_from: 'assets/a.mp4' }, env.state()));
    check('an unreadable clip is an error, not an unrelated new video', !!e3 && /last frame/.test(e3.message) && env.calls.txt2vid.length === 0);
    const e4 = await rejects(env.tool('GenerateVideo').exec({ prompt: 'x', continue_from: '/u/AppData/app/.media/chat2/v.mp4' }, env.state()));
    check('continue_from from another chat is refused', !!e4 && env.calls.frames.length === 1);
}

// ---- 10b. The last frame of a browser recording ---------------------------
// A MediaRecorder WebM reports duration Infinity until the browser walks to
// its end (checked in Chrome), so continue_from used to take frame 0. Runs the
// real videoFrameDataURL against a <video> stub that behaves that way.
{
    const a = mediaSrc.indexOf('async function videoFrameDataURL');
    const b = mediaSrc.indexOf('// ---- Lightbox');
    const REAL_END = 7.5;
    const makeVideo = (initialDuration) => {
        const l = {};
        const fire = (ev) => (l[ev] || []).splice(0).forEach((f) => f());
        const v = {
            duration: initialDuration, _t: 0, videoWidth: 640, videoHeight: 360,
            addEventListener(ev, f) { (l[ev] ||= []).push(f); },
            removeAttribute() {}, load() {},
            set src(x) { setTimeout(() => fire('loadeddata')); },
            get currentTime() { return this._t; },
            set currentTime(t) {
                // Seeking past the end: the browser finds the real duration.
                if (t >= REAL_END) this.duration = REAL_END;
                this._t = Math.min(t, REAL_END);
                setTimeout(() => fire('seeked'));
            },
        };
        return v;
    };
    let video;
    const document = {
        createElement: (tag) => (tag === 'video' ? video : { getContext: () => ({ drawImage() {} }), toDataURL: () => 'data:image/jpeg;base64,x' }),
    };
    const URLStub = { createObjectURL: () => 'blob:x', revokeObjectURL() {} };
    const fn = new Function('puter', 'document', 'URL', mediaSrc.slice(a, b) + '; return videoFrameDataURL;')(
        { fs: { read: async () => ({}) } }, document, URLStub);
    video = makeVideo(Infinity);
    const r = await fn('/x.webm');
    check('continue_from: a recording with no duration header still yields its last frame', Math.abs(r.time - (REAL_END - 0.05)) < 1e-6 && r.duration === REAL_END, r);
    video = makeVideo(4);
    const r2 = await fn('/x.mp4');
    check('continue_from: a normal clip still yields its last frame', Math.abs(r2.time - 3.95) < 1e-6 && r2.duration === 4, r2);
}

// ---- 11a. A grid with an unsaved version still restores the rest -----------
// A version that could not be saved is persisted with path: null. The reload
// built one URL per item but renderSaved dropped unsaved items first, so every
// later URL landed on the wrong tile; and with the FIRST version unsaved the
// result had no path, so loadChat skipped the whole grid.
{
    const env = makeEnv();
    env.saveOnGenerate = false;
    let n = 0;
    env.win.GeneratedMedia.saveFromSrc = async (src, path) => { if (n++ === 0) throw new Error('save failed'); env.calls.saved.push([src, path]); };
    const r = await env.tool('GenerateImage').exec({ prompt: 'x', count: 3 }, env.state());
    check('grid: the result points at a saved version when the first one was not saved',
        r.items[0].path === null && r.path === r.items[1].path && !!r.path, r.items.map(i => i.path));
    check('grid: loadChat still restores a grid whose own path is unset (older chats)',
        /toolResponse\.items\.some\(it => it && it\.path\)/.test(appSrc));

    const a = mediaSrc.indexOf('function renderSaved');
    const b = mediaSrc.indexOf('// Read an image file');
    const shown = [];
    let gridCount = 0;
    const renderSaved = new Function('gridMessage', 'fillCard', 'removeCard', 'chatBox', 'buildCard', mediaSrc.slice(a, b) + '; return renderSaved;')(
        ({ count }) => { gridCount = count; return { $msg: {}, tiles: Array.from({ length: count }, (_, i) => ({ i })) }; },
        (tile, o) => shown.push([tile.i === undefined ? 'single' : tile.i, o.url, o.path]),
        (tile) => shown.push([tile.i, 'removed']),
        () => ({ append() {} }), () => ({}));
    const result = { success: true, kind: 'image', prompt: 'x', path: '/m/2.png', filename: '2.png',
        items: [{ path: null, filename: '1.png' }, { path: '/m/2.png', filename: '2.png' }, { path: '/m/3.png', filename: '3.png' }] };
    renderSaved(result, [null, 'URL2', 'URL3']);
    check('grid: each restored tile gets its own image', gridCount === 2
        && JSON.stringify(shown) === JSON.stringify([[0, 'URL2', '/m/2.png'], [1, 'URL3', '/m/3.png']]), shown);
    shown.length = 0;
    renderSaved({ ...result, items: [{ path: null }, { path: '/m/2.png', filename: '2.png' }] }, [null, 'URL2']);
    check('grid: a lone saved version restores as a single image', JSON.stringify(shown) === JSON.stringify([['single', 'URL2', '/m/2.png']]), shown);
}

// ---- 11b. Oversized inputs get the right explanation -------------------------
// Puter uses code input_too_large both for speech text over its character
// limit and for oversized image inputs; each gets its own explanation.
{
    const tooLarge = () => { const e = new Error('Input size cannot be larger than 25 MB'); e.code = 'input_too_large'; throw e; };
    const env = makeEnv();
    env.generateImpl = async () => tooLarge();
    const e3 = await rejects(env.tool('GenerateSpeech').exec({ text: 'x' }, env.state()));
    check('speech: text over the limit still says to split the text', !!e3 && /3,000 characters/.test(e3.message), e3 && e3.message);
    const e4 = await rejects(env.tool('GenerateImage').exec({ prompt: 'x' }, env.state()));
    check('image: an oversized input is not described as a long audio text', !!e4 && !/characters/.test(e4.message) && /too large/.test(e4.message), e4 && e4.message);
}

// ---- 12. Analytics (Plausible, via window.track) ---------------------------
// One event per request, with the request's options and never the prompt.
{
    const env = makeEnv();
    const PROMPT = 'A secret prompt about a red fox';
    await env.tool('GenerateImage').exec({ prompt: PROMPT, aspect_ratio: '16:9', quality: 'high', save_to_project: 'assets/hero.png' }, env.state());
    const [ev, props] = env.calls.tracked[0] || [];
    check('analytics: an image sends "Image Generated" with its options', ev === 'Image Generated'
        && props.aspect_ratio === '16:9' && props.quality === 'high' && props.edit === false && props.for_project === true && props.count === 1, env.calls.tracked);
    check('analytics: the prompt and file names are never sent', !JSON.stringify(env.calls.tracked).includes('fox') && !JSON.stringify(env.calls.tracked).includes('hero'));

    env.calls.tracked.length = 0;
    await env.tool('GenerateImage').exec({ prompt: 'x', input_images: ['assets/me.jpg'] }, env.state());
    check('analytics: an edit is marked as one, with the default ratio', env.calls.tracked[0][1].edit === true && env.calls.tracked[0][1].aspect_ratio === 'default' && env.calls.tracked[0][1].for_project === false, env.calls.tracked);

    env.calls.tracked.length = 0;
    await env.tool('GenerateImage').exec({ prompt: 'x', count: 3 }, env.state());
    check('analytics: a multi-image request is ONE event with its count', env.calls.tracked.length === 1 && env.calls.tracked[0][0] === 'Image Generated' && env.calls.tracked[0][1].count === 3 && !('failed' in env.calls.tracked[0][1]), env.calls.tracked);

    env.calls.tracked.length = 0;
    await env.tool('GenerateVideo').exec({ prompt: 'x', seconds: 8, input_image: 'assets/beach.png', with_sound: false }, env.state());
    const v = env.calls.tracked[0] || [];
    check('analytics: a video sends "Video Generated" with length, start and sound', v[0] === 'Video Generated' && v[1].seconds === 8 && v[1].start === 'image' && v[1].with_sound === false, env.calls.tracked);
    env.calls.tracked.length = 0;
    await env.tool('GenerateVideo').exec({ prompt: 'x', continue_from: MEDIA + '/video_1.mp4' }, env.state());
    check('analytics: continuing a clip is reported as such', env.calls.tracked[0][1].start === 'continue', env.calls.tracked);

    env.calls.tracked.length = 0;
    await env.tool('GenerateSpeech').exec({ text: 'Hello there.', voice: 'nova', instructions: 'warm' }, env.state());
    const a = env.calls.tracked[0] || [];
    check('analytics: speech sends "Audio Generated" with its voice', a[0] === 'Audio Generated' && a[1].voice === 'nova' && a[1].styled === true && !JSON.stringify(a).includes('Hello'), env.calls.tracked);
}
{
    const env = makeEnv();
    env.generateImpl = async () => { throw Object.assign(new Error('flagged'), { errorCode: 'moderation_flagged' }); };
    await rejects(env.tool('GenerateImage').exec({ prompt: 'x' }, env.state()));
    check('analytics: a refused image sends "Image Generation Failed" with the reason',
        env.calls.tracked.length === 1 && env.calls.tracked[0][0] === 'Image Generation Failed' && env.calls.tracked[0][1].reason === 'moderation', env.calls.tracked);

    env.calls.tracked.length = 0;
    env.generateImpl = async () => { throw Object.assign(new Error('broke'), { code: 'insufficient_funds' }); };
    await rejects(env.tool('GenerateImage').exec({ prompt: 'x', count: 2 }, env.state()));
    check('analytics: a grid that fails entirely is ONE failure event', env.calls.tracked.length === 1 && env.calls.tracked[0][0] === 'Image Generation Failed' && env.calls.tracked[0][1].reason === 'insufficient_funds' && env.calls.tracked[0][1].count === 2, env.calls.tracked);

    env.calls.tracked.length = 0;
    let n = 0;
    env.generateImpl = async (p, o) => { if (n++ === 0) throw new Error('boom'); env.existing.add(o.puter_output_path); return { src: env.src }; };
    await env.tool('GenerateImage').exec({ prompt: 'x', count: 3 }, env.state());
    check('analytics: a partly failed grid is a success that says how many failed', env.calls.tracked.length === 1 && env.calls.tracked[0][0] === 'Image Generated' && env.calls.tracked[0][1].failed === 1, env.calls.tracked);

    env.calls.tracked.length = 0;
    env.generateImpl = async () => { throw Object.assign(new Error('slow'), { code: 'upstream_timeout' }); };
    await rejects(env.tool('GenerateVideo').exec({ prompt: 'x' }, env.state()));
    check('analytics: a failed video sends "Video Generation Failed"', env.calls.tracked[0][0] === 'Video Generation Failed' && env.calls.tracked[0][1].reason === 'timeout', env.calls.tracked);

    env.calls.tracked.length = 0;
    env.generateImpl = async () => null;
    await rejects(env.tool('GenerateSpeech').exec({ text: 'x' }, env.state()));
    check('analytics: an empty result is a failure too', env.calls.tracked[0][0] === 'Audio Generation Failed' && env.calls.tracked[0][1].reason === 'empty', env.calls.tracked);
}

// ---- 13. Pure helpers -------------------------------------------------------
{
    const env = makeEnv();
    const name = env.win.GeneratedMedia.fileName('image', '../../<script>alert(1)</script> fox', 'png');
    check('file names are a safe single segment', !name.includes('/') && !name.includes('<') && /^image_\d{8}_\d{6}_[a-z0-9]{1,4}_[a-z0-9-]+\.png$/.test(name), name);
    check('an unknown aspect ratio is ignored', env.win.GeneratedMedia.parseRatio('7:5') === null);
}

// ---- 14. Wiring -------------------------------------------------------------
const order = ['js/media.js', 'tools/media/generate_image.js', 'tools/media/generate_video.js', 'tools/media/generate_speech.js'].map(f => viteSrc.indexOf(`'${f}'`));
check('the bundle loads media.js, then the media tools', order.every(i => i > 0) && order.every((v, i) => i === 0 || order[i - 1] < v)
    && viteSrc.indexOf("'tools/fs/view_image.js'") < order[0]);
check('loadChat re-renders saved generations through GeneratedMedia', appSrc.includes('window.GeneratedMedia?.renderSaved(toolResponse, readURL)'));
check('deleting a chat deletes its media folder', /const mediaDir = window\.mediaDirForAppDir\?\.\(appDir\);[\s\S]{0,120}puter\.fs\.delete\(mediaDir, \{ recursive: true \}\)/.test(appSrc));
check('duplicating a chat rewrites media paths (never splitting on an empty string)',
    appSrc.includes('if (oldMediaDir && newMediaDir) clonedJson = clonedJson.split(oldMediaDir).join(newMediaDir);'));
check('media.js never writes HTML from strings it was given', !/\.html\(/.test(mediaSrc));
check('loadChat re-renders saved grids', appSrc.includes('Array.isArray(toolResponse.items) && toolResponse.items.length > 1'));
check('the prompt tells the model about the media tools', ['GenerateImage', 'GenerateVideo', 'GenerateSpeech', 'save_to_project'].every(w => read('../src/js/prompt.js').includes(w)));
check('switching chats closes the image viewer', appSrc.includes('window.GeneratedMedia?.closeLightbox?.(false);'));

// ---- Input images name their type ---------------------------------------------
// puter.fs.read returns files untyped (application/octet-stream). An image
// that already fit went through as is, so its data: URI said
// application/octet-stream and the image editor refused it — every edit or
// animation of a generated image failed, while a big photo, re-encoded on the
// way, worked. Runs the real imageDataURL with a browser-like FileReader.
{
    const a = mediaSrc.indexOf('const PROVIDER_IMAGE_TYPES');
    const b = mediaSrc.indexOf('\n    }\n', mediaSrc.indexOf('async function imageDataURL', a)) + 6;
    const viewSrc = read('../src/tools/fs/view_image.js');
    const sa = viewSrc.indexOf('function sniffImageType');
    const sniffImageType = new Function(viewSrc.slice(sa, viewSrc.indexOf('\n    }\n', sa) + 6) + '; return sniffImageType;')();
    class FileReader {
        readAsDataURL(blob) {
            blob.arrayBuffer().then((buf) => {
                this.result = `data:${blob.type || 'application/octet-stream'};base64,` + Buffer.from(buf).toString('base64');
                this.onload();
            });
        }
    }
    const PNG = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
    const GIF = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0]);
    const files = { '/m/small.png': PNG, '/m/anim.gif': GIF };
    const forced = [];
    const win = { __viewImageInternals: {
        sniffImageType,
        // An image that fits comes back untouched; a forced one is re-encoded as PNG.
        fitImageForVision: async (blob, mediaType, { force = false } = {}) => {
            forced.push(force);
            return force
                ? { blob: new Blob([PNG], { type: 'image/png' }), mediaType: 'image/png', fitted: true }
                : { blob, mediaType, fitted: false };
        },
    } };
    const puter = { fs: { read: async (p) => new Blob([files[p]]) } }; // untyped, like Puter
    const imageDataURL = new Function('window', 'puter', 'FileReader', mediaSrc.slice(a, b) + '; return imageDataURL;')(win, puter, FileReader);
    const png = await imageDataURL('/m/small.png');
    check('an untyped PNG that already fits is sent as image/png, not application/octet-stream', png.startsWith('data:image/png;base64,'), png.slice(0, 40));
    check('…without re-encoding it', forced[0] === false);
    const gif = await imageDataURL('/m/anim.gif');
    check('a GIF (which the editors refuse) is re-encoded to a type they take', forced[1] === true && gif.startsWith('data:image/png;base64,'), gif.slice(0, 40));
}

if (failures) { console.error(`\n${failures} generated-media check(s) failed`); process.exit(1); }
console.log('\nall generated-media checks passed');
