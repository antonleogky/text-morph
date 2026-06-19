# text-morph

An interactive text component that morphs **clean, readable type into a gnarly
hardcore / death-metal band logo** as you drag a slider — inspired by the
morphing footer wordmark on [ravalabs.com](https://www.ravalabs.com/), pushed
toward the spiked "brutal" lettering of hardcore group artwork.

At **Brutality 0** the text is crisp and legible. As you drag toward **100**,
the wordmark stays centered in place and resolves into a real death-metal
logotype with the sharp, thorny font spikes of band artwork.

## How it works

Pure SVG filters can warp and erode text, but they can't conjure the sharp,
designed spikes of a death-metal typeface — so the brutal end is the genuine
article: the bundled **Sagerange** display font (`src/fonts/`).
`src/MorphText.jsx` stacks two `<text>` layers in the same centered spot:

- the readable text in the selected font
- the same text in the death-metal font

A **complementary crossfade** hands one layer off to the other — their
opacities always sum to 1, so brightness stays constant through the middle
instead of dimming into a foggy double-exposure. A shared **`feTurbulence` +
`feDisplacementMap` warp** distorts both layers on a bell curve: zero at the
clean end, chaos through the middle of the drag, then back to zero at the top
so the final logo lands crisp. A *randomize* button reseeds the noise.

## Share & export

- **Share link** — the full morph state (text, brutality, seed, font) is encoded
  in the URL hash, so any configuration is reproducible from a link. The *share
  link* button copies the current URL to your clipboard.
- **Export SVG** — the *export SVG* button downloads the rendered wordmark as a
  self-contained `.svg` file.

## Develop

Requires Node 18+.

```bash
npm install
npm run dev      # http://localhost:5191
npm run build    # production build → dist/
```

## Deploy

`npm run build:pages` emits a build with the `/text-morph/` base path for
GitHub Pages. A workflow in `.github/workflows/deploy.yml` deploys on push to
`main` — enable **Settings → Pages → GitHub Actions** in the repo.
