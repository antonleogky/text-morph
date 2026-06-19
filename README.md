# text-morph

**▶︎ Try it live: [antonleogky.github.io/text-morph](https://antonleogky.github.io/text-morph/)**

An interactive text component that morphs **clean, readable type into a gnarly
hardcore / death-metal band logo** as you drag a slider — inspired by the
morphing footer wordmark on [ravalabs.com](https://www.ravalabs.com/), pushed
toward the spiked "brutal" lettering of hardcore group artwork.

At **Brutality 0** the text is crisp and legible. As you drag toward **100**,
sharp thorns, upward rakes and downward drips grow out of the letters
themselves until the wordmark becomes a death-metal logo — a true geometric
transformation, not a font swap or a crossfade.

## How it works

The logo is built *procedurally* the way death-metal logos actually are —
gothic letterforms pushed to their limits with calibrated spikes — rather than
faked with filters or swapped for a spiky font. The engine lives in
`src/morph.js`:

1. **Outlines** — [opentype.js](https://github.com/opentypejs/opentype.js)
   reads the vector outline of each letter from the selected font and flattens
   it to evenly-spaced points.
2. **Thorn plan** — every point on a glyph's outer silhouette gets an outward
   normal and a seeded thorn length. Thorns *rake*: they lean away from the
   word's midline (up on top, down into drips on the bottom), throw big
   horizontal "wings" at the far ends, and grow longer toward the extremes —
   which is what reads as a logo instead of a starburst.
3. **Morph** — rendering is just `point + direction × length × amount`, where
   `amount` rises with the slider. At 0 every thorn is zero (the clean letter);
   toward 100 they extend, so it's a smooth, fully reversible geometric morph.

Because it's pure geometry, the result is crisp vector art at every step, and
the *randomize* button reseeds the thorns. Exported SVGs are self-contained
(plain `<path>` data, no font needed).

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
