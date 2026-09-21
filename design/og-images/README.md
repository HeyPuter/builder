# og:image design options

Five candidate designs for the site's og:image (`src/og-image.png`), kept for
future swaps. Each `.html` is the editable source (1200×630, uses the repo's
vendored Roboto and root `icon.png`); each `.png` is its rendered preview.

Currently shipped: **4-icon-brand-card**.

To regenerate a PNG after editing a source (renders at 2x, then downscales for
crisp text):

```sh
cd design/og-images
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless \
  --disable-gpu --allow-file-access-from-files --hide-scrollbars \
  --window-size=1200,630 --force-device-scale-factor=2 \
  --screenshot=out.png "file://$PWD/4-icon-brand-card.html"
sips -z 630 1200 out.png --out 4-icon-brand-card.png && rm out.png
```

To ship one: copy its `.png` over `src/og-image.png` (the build copies it to
`dist/`). All options are 1200×630, matching the `og:image:width/height` meta
tags in `src/index.html`.
