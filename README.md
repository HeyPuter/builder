<h3 align="center"><img width="100" alt="Build logo" src="./icon-256.png"></h3>
<h3 align="center">AI Builder For Creating Sites and Apps!</h3>

<p align="center">
    <a href="https://builder.puter.com/"><strong>« LIVE DEMO »</strong></a>
    <br />
    <br />
    <a href="https://builder.puter.com">Official Site</a>
    ·
    <a href="https://puter.com">Puter.com</a>
    ·
    <a href="https://developer.puter.com/">Developers</a>
    ·
    <a href="https://twitter.com/HeyPuter">X</a>
</p>

<h3 align="center"><img style="border-radius:5px;" alt="screenshot" src="./src/screenshots/gh.png"></h3>

<br>

## AI Builder

Use AI to build websites and applications without writing any code. An open-source alternative to Lovable, Replit, v0, and similar platforms, AI Builder is licensed under the Apache License 2.0 to ensure freedom and flexibility for developers. Fork it, customize it, and make it your own!

AI Builder uses <a href="https://developer.puter.com/">Puter.js</a> to provide everything your projects might need; from authentication, storage, and database to serverless functions, hosting, and real-time capabilities, all seamlessly integrated without requiring any additional setup.

<br>

## Features

Go from an idea to a working website or application in your browser. AI Builder brings creation, editing, and publishing together in one place.

- **Build with AI:** Describe what you want in plain language and turn it into a website or application, without coding or any technical knowledge.
- **Secure and scalable apps:** Built on <a href="https://github.com/HeyPuter/puter">Puter's Open-source Internet OS</a> technology, your apps will run securely and scale effortlessly without requiring you to manage infrastructure or API keys.
- **Batteries included:** Authentication, storage, databases, AI, networking, realtime capabilities, and serverless functions, all handled seamlessly by Puter.js.
- **Publish and share:** Publish your project to a public URL when you're ready to share it with the world.
- **Live preview:** See your project take shape and try it out as you make changes.
- **Chat and visual editing:** Ask for changes in chat or select an element in the preview to tell the AI exactly what to update.
- **Version history:** Revisit saved versions and restore an earlier state as you experiment with your project.

Follow the steps below to start building your first website or app.

<br>

## Getting Started

### 💻 Installation

```bash
git clone https://github.com/HeyPuter/builder
cd builder
npm install
npm run dev
```

<br>

### 🌐 Live Demo

Check out the live demo of AI Builder at [https://builder.puter.com/](https://builder.puter.com/).

<br>


## MCP connections

Open the account menu and choose **MCP connections** to add a remote server URL
and an optional bearer token. Connected tools become available to Builder's AI
across your projects. You can inspect the tool list, disconnect, or remove a
server from the same panel. Reconnect to refresh a server's tool list.

This client supports **HTTPS Streamable HTTP** servers, including JSON and SSE
responses and paginated tool discovery. OAuth sign-in, legacy SSE endpoints,
local command/stdio servers, MCP resources, and MCP prompts are not supported.
Connections belong to Builder's assistant; generated apps do not inherit them.

Server names and URLs are saved locally per Puter account. Connections are not
automatically re-established after a reload. Bearer tokens stay in memory until
disconnect/reload and are never saved to settings or project files. Use the
token field rather than putting credentials in the URL. Only connect servers
you trust with tool inputs and actions on your external services.

Networking is browser-first. HTTP errors (including 401, 403, 429 and 5xx),
timeouts, aborts, and tool failures never trigger a Puter retry. During initial
discovery only, a cross-origin fetch TypeError followed by a successful opaque
`no-cors` HEAD probe to the same endpoint permits `puter.net.fetch` as a CORS
fallback. Browsers do not expose a definitive CORS-error API, so this is a
best-effort diagnosis; DNS/TLS/offline failures that also fail the probe do not
use the relay. Private/internal hosts are never relayed. The selected transport
stays fixed after discovery, and reconnect always tries the browser again.
Tool actions are never automatically replayed through the fallback: a failed
response does not prove an action failed to execute.

For direct browser access, configure the server to allow Builder's origin,
the MCP HTTP methods and request headers, and expose `Mcp-Session-Id` on
session-based servers. Redirects are not followed; enter the final endpoint URL.

Run `npm run test:mcp` for SDK-backed protocol, fallback, cancellation, tool
routing, and account-isolation regression checks.

## Support

Connect with the maintainers and community through these channels:

- Bug report or feature request? Please [open an issue](https://github.com/HeyPuter/builder/issues/new/choose).
- X (Twitter): [x.com/HeyPuter](https://x.com/HeyPuter)
- Security issues or abuse reports? [security@puter.com](mailto:security@puter.com)
- Email maintainers at [hi@puter.com](mailto:hi@puter.com)

We are always happy to help you with any questions you may have. Don't hesitate to ask!

<br/>

## License

This repository, including all its contents, sub-projects, modules, and components, is licensed under [Apache License 2.0](LICENSE) unless explicitly stated otherwise. Bundled third-party libraries and fonts retain their own licenses; see [Third-party notices](THIRD_PARTY_NOTICES.md).

<br/>
