# text-morph

**▶︎ Try it live: [antonleogky.github.io/text-morph](https://antonleogky.github.io/text-morph/)**

An interactive text component that morphs **clean, readable type into a gnarly
death-metal band logo** as you drag a slider — a faithful recreation of the
morphing footer wordmark on [ravalabs.com](https://www.ravalabs.com/).

At **Brutality 0** the text is crisp and legible. As you drag toward **100** it
fluidly *path-morphs* through a sequence of display typefaces and lands as a
death-metal logotype.

## How it works

The ravalabs footer wordmark is the same text drawn as SVG paths in several
different display typefaces, fluidly tweened from one to the next. This does
exactly that for arbitrary typed text. The engine lives in `src/morph.js`:

1. **Outlines** — [opentype.js](https://github.com/opentypejs/opentype.js)
   reads each letter's vector outline from a sequence of fonts: your chosen
   readable face → **Anton** (heavy) → **Metal Mania** (death-metal). Layout is
   done char-by-char (`charToGlyph`) so every font aligns letter-for-letter.
2. **Tween** — [flubber](https://github.com/veltman/flubber) builds a path
   interpolation between each letter's outline in consecutive fonts. Compound
   glyphs (counters, multi-piece death-metal letters) are split into contours,
   paired biggest-to-biggest, and any leftover pieces grow/collapse from a
   point so mismatched shapes still morph cleanly.
3. **Morph** — the slider drives a position across the stages; each glyph snaps
   to the exact font outline at the ends and tweens in between, so the morph is
   smooth and fully reversible.

Exported SVGs are self-contained `<path>` data (no font needed).

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
