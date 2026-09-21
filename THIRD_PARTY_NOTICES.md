# Third-party notices

AI Builder includes the third-party software and fonts listed below. These
components retain their respective licenses and copyright notices. The project's
Apache License 2.0 does not replace those licenses.

## JavaScript and CSS

| Component | Included files | License and notices | Upstream source |
| --- | --- | --- | --- |
| jQuery 3.7.1 | `src/vendor/jquery.min.js` | [MIT](licenses/jquery-LICENSE.txt) | [jQuery 3.7.1](https://github.com/jquery/jquery/tree/3.7.1) |
| Marked 15.0.6 | `src/vendor/marked.umd.min.js` | [MIT and Markdown notices](licenses/marked-LICENSE.md) | [Marked v15.0.6](https://github.com/markedjs/marked/tree/v15.0.6) |
| Highlight.js 11.9.0, including the Atom One Dark theme | `src/vendor/highlight.min.js`, `src/vendor/highlight-atom-one-dark.min.css` | [BSD-3-Clause](licenses/highlight.js-LICENSE.txt) | [Highlight.js 11.9.0](https://github.com/highlightjs/highlight.js/tree/11.9.0) |
| JSZip 3.10.1 | `src/vendor/jszip.min.js` | [MIT or GPLv3](licenses/jszip-LICENSE.md); this project uses the MIT option | [JSZip v3.10.1](https://github.com/Stuk/jszip/tree/v3.10.1) |
| Normalize.css 8.0.1 | `src/css/normalize.css` | [MIT](licenses/normalize.css-LICENSE.md) | [Normalize.css 8.0.1](https://github.com/necolas/normalize.css/tree/8.0.1) |

The JSZip browser bundle also contains the following components. Their notices
apply to the code within `src/vendor/jszip.min.js`:

| Component | License and notices | Source of license text |
| --- | --- | --- |
| pako | [MIT](licenses/pako-LICENSE.txt) and [zlib notices](licenses/pako-zlib-LICENSE.txt) | [pako 1.0.11](https://registry.npmjs.org/pako/-/pako-1.0.11.tgz), including the notices in `lib/zlib/` |
| lie | [MIT](licenses/lie-LICENSE.md) | [lie 3.3.0](https://registry.npmjs.org/lie/-/lie-3.3.0.tgz) |
| immediate | [MIT](licenses/immediate-LICENSE.txt) | [immediate 3.0.6](https://registry.npmjs.org/immediate/-/immediate-3.0.6.tgz) |
| setImmediate | [MIT](licenses/setimmediate-LICENSE.txt) | [setimmediate 1.0.5](https://registry.npmjs.org/setimmediate/-/setimmediate-1.0.5.tgz) |

## Fonts and icons

Font names, versions, and copyright statements below come from the bundled
WOFF2 metadata. The font stylesheets are `src/vendor/google-fonts.css` and
`src/vendor/material-symbols.css`.

| Component | Included files | Copyright | License and upstream source |
| --- | --- | --- | --- |
| Bungee Shade 2.000 | `src/vendor/fonts/gf-001.woff2` through `gf-003.woff2` | Copyright 2023 The Bungee Project Authors | [SIL OFL 1.1](licenses/bungee-shade-OFL.txt), [upstream](https://github.com/google/fonts/tree/main/ofl/bungeeshade) |
| Roboto 3.015 | `src/vendor/fonts/gf-004.woff2` through `gf-021.woff2` | Copyright 2011 The Roboto Project Authors | [SIL OFL 1.1](licenses/roboto-OFL.txt), [upstream](https://github.com/google/fonts/tree/main/ofl/roboto) |
| Roboto Mono 3.001 | `src/vendor/fonts/gf-022.woff2` through `gf-033.woff2` | Copyright 2015 The Roboto Mono Project Authors | [SIL OFL 1.1](licenses/roboto-mono-OFL.txt), [upstream](https://github.com/google/fonts/tree/main/ofl/robotomono) |
| Material Symbols Outlined 2.944 | `src/vendor/fonts/material-symbols-001.woff2` | Copyright 2026 Google LLC. All Rights Reserved. | [Apache License 2.0](licenses/material-symbols-LICENSE.txt), [upstream](https://github.com/google/material-design-icons) |

The downloaded font stylesheets have been modified to reference bundled font
files instead of Google Fonts URLs. The build may rename font files with content
hashes and concatenate or minify JavaScript and CSS. These notices also apply to
those generated assets.

## Distribution and maintenance

The production build copies this document and the `licenses/` directory into its
output alongside the application. Keep them with distributions of the built app.

When updating vendored assets with `scripts/fetch-vendor.mjs`, update their
licenses, copyright notices, and this inventory as needed. JavaScript and CSS
license files were taken from the corresponding npm release archives. Font
license texts were taken from the upstream repositories linked above.

Puter.js is loaded from its CDN rather than included in this repository. Build
dependencies installed through npm carry their own licenses in their packages;
they are not part of this inventory of bundled browser assets.
