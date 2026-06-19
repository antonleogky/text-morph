# text-morph

An interactive text component that morphs **clean, readable type into a gnarly
hardcore / death-metal band logo** as you drag a slider — inspired by the
morphing footer wordmark on [ravalabs.com](https://www.ravalabs.com/), pushed
toward the spiked "brutal" lettering of hardcore group artwork.

At **Brutality 0** the text is crisp and legible. As you drag toward **100**,
the *same glyphs* stay in place and grow thorns, warp, and thicken — a true
geometric morph rather than a crossfade between two fonts.

## How it works

It's pure SVG filters on a single `<text>` element (`src/MorphText.jsx`):

- **coarse turbulence displacement** warps the overall silhouette
- **fine high-frequency displacement** grows the thorny spikes
- **`feMorphology` dilate** thickens strokes into a heavy metal weight
- **per-glyph `rotate`** adds the chaotic tilt of band logos

Every parameter is interpolated from one slider value, so the morph is smooth
and fully reversible. A *randomize spikes* button reseeds the noise.

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
