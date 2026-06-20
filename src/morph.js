// Wordmark morph engine — the ravalabs.com footer technique.
//
// The text is drawn as glyph outlines in a readable font and in a death-metal
// font, and flubber path-tweens between them. To keep scrubbing perfectly
// smooth no matter how complex the target font is, the tween is sampled into a
// fixed set of frames once per text/font change; dragging the slider is then
// just an O(1) frame lookup, so the morph flows the whole length of the slider.

import { parse as parseFont } from 'opentype.js'
import { interpolate, toCircle, fromCircle, splitPathString } from 'flubber'

import InterUrl from './fonts/Inter.woff?url'
import GeistUrl from './fonts/Geist.woff?url'
import IBMPlexSansUrl from './fonts/IBMPlexSans.woff?url'
import GoogleSansUrl from './fonts/GoogleSans.ttf?url'
import InstrumentSerifUrl from './fonts/InstrumentSerif.woff?url'
import MetalManiaUrl from './fonts/MetalMania.woff?url'

// Readable starting faces the user can pick (key -> file + CSS family).
export const SOURCE_FONTS = {
  Inter: { url: InterUrl, css: '"Inter", sans-serif' },
  Geist: { url: GeistUrl, css: '"Geist", sans-serif' },
  'IBM Plex Sans': { url: IBMPlexSansUrl, css: '"IBM Plex Sans", sans-serif' },
  'Google Sans': { url: GoogleSansUrl, css: '"Google Sans", sans-serif' },
  'Instrument Serif': { url: InstrumentSerifUrl, css: '"Instrument Serif", serif' },
}

// The death-metal face the text morphs into. (Swappable — e.g. Death Mohawk /
// Zeus Borne once their files are in src/fonts.)
const TARGET_URL = MetalManiaUrl

const FRAMES = 44
const flubberOpts = { maxSegmentLength: 20 }

const fontCache = new Map()
function loadFont(url) {
  if (!fontCache.has(url)) {
    fontCache.set(
      url,
      fetch(url)
        .then((r) => r.arrayBuffer())
        .then((buf) => parseFont(buf)),
    )
  }
  return fontCache.get(url)
}

// Approx center + area of one contour, read straight off the path numbers
// (every M/L/C/Q coordinate is an x,y pair). Used to rank and collapse contours.
function contourInfo(d) {
  const nums = d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  if (nums) {
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const x = +nums[i]
      const y = +nums[i + 1]
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    area: Math.max(0, maxX - minX) * Math.max(0, maxY - minY),
  }
}

const isEmpty = (d) => !d || !d.trim()

// Build a tween between one glyph's outline in font A and font B. Glyphs are
// compound paths (an "O" has a counter; a death-metal glyph has many pieces),
// so split into contours, pair them biggest-to-biggest, and grow/collapse any
// leftover contours from/to a point so mismatched counts still morph smoothly.
function buildGlyphTween(srcD, dstD) {
  if (isEmpty(srcD) && isEmpty(dstD)) return () => ''
  if (isEmpty(srcD)) {
    const fns = splitPathString(dstD).map((c) => {
      const b = contourInfo(c)
      return fromCircle(b.cx, b.cy, 0.1, c, flubberOpts)
    })
    return (tt) => fns.map((f) => f(tt)).join(' ')
  }
  if (isEmpty(dstD)) {
    const fns = splitPathString(srcD).map((c) => {
      const b = contourInfo(c)
      return toCircle(c, b.cx, b.cy, 0.1, flubberOpts)
    })
    return (tt) => fns.map((f) => f(tt)).join(' ')
  }
  const src = splitPathString(srcD).sort((a, b) => contourInfo(b).area - contourInfo(a).area)
  const dst = splitPathString(dstD).sort((a, b) => contourInfo(b).area - contourInfo(a).area)
  const n = Math.max(src.length, dst.length)
  const fns = []
  for (let i = 0; i < n; i++) {
    const a = src[i]
    const b = dst[i]
    if (a && b) {
      fns.push(interpolate(a, b, flubberOpts))
    } else if (a) {
      const c = contourInfo(a)
      fns.push(toCircle(a, c.cx, c.cy, 0.1, flubberOpts))
    } else {
      const c = contourInfo(b)
      fns.push(fromCircle(c.cx, c.cy, 0.1, b, flubberOpts))
    }
  }
  return (tt) => fns.map((f) => f(tt)).join(' ')
}

// Lay a word out centered + scaled to fit the box, one compound path per
// character. charToGlyph avoids opentype's GSUB/Bidi engine (which throws on
// display fonts), gives exactly one glyph per character so the two fonts align
// index-for-index, and integer size/offsets dodge an opentype NaN bug at some
// fractional sizes.
function layoutWord(font, text, { boxW, boxH, cx, cy }) {
  const base = 100
  const unitScale = base / font.unitsPerEm
  const chars = Array.from(text)

  let pen = 0
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  const placed = chars.map((ch) => {
    const glyph = font.charToGlyph(ch)
    const bb = glyph.getPath(pen, 0, base).getBoundingBox()
    if (Number.isFinite(bb.x1)) {
      minX = Math.min(minX, bb.x1)
      maxX = Math.max(maxX, bb.x2)
      minY = Math.min(minY, bb.y1)
      maxY = Math.max(maxY, bb.y2)
    }
    const item = { glyph, x: pen }
    pen += glyph.advanceWidth * unitScale
    return item
  })

  const w = maxX - minX || 1
  const h = maxY - minY || 1
  const scale = Math.min(boxW / w, boxH / h)
  const fontSize = Math.round(base * scale)
  const offX = Math.round(cx - ((minX + maxX) / 2) * scale)
  const offY = Math.round(cy - ((minY + maxY) / 2) * scale)

  return placed.map(({ glyph, x }) => {
    const d = glyph.getPath(Math.round(x * scale) + offX, offY, fontSize).toPathData(2)
    return d.includes('NaN') ? '' : d
  })
}

/**
 * Build the wordmark morph for `text` from source font `fontKey` into the
 * death-metal target. Async (fonts fetched). Each glyph is pre-sampled into
 * `FRAMES` path strings spanning clean (0) -> brutal (1), with the exact font
 * outlines pinned at the ends.
 */
export async function buildMorph(fontKey, text, box) {
  const start = SOURCE_FONTS[fontKey] ?? SOURCE_FONTS.Inter
  const [srcFont, dstFont] = await Promise.all([loadFont(start.url), loadFont(TARGET_URL)])
  const srcLayout = layoutWord(srcFont, text, box)
  const dstLayout = layoutWord(dstFont, text, box)
  const count = Math.max(srcLayout.length, dstLayout.length)

  const glyphs = []
  for (let i = 0; i < count; i++) {
    const a = srcLayout[i] ?? ''
    const b = dstLayout[i] ?? ''
    const tween = buildGlyphTween(a, b)
    const frames = new Array(FRAMES)
    frames[0] = a
    frames[FRAMES - 1] = b
    for (let k = 1; k < FRAMES - 1; k++) frames[k] = tween(k / (FRAMES - 1))
    glyphs.push({ frames })
  }
  return { glyphs, frames: FRAMES }
}

// Pick the precomputed frame nearest morph position t (0..1) — an O(1) lookup,
// so scrubbing the slider is always smooth.
export function glyphFrame(glyph, frames, t) {
  const i = Math.max(0, Math.min(frames - 1, Math.round(t * (frames - 1))))
  return glyph.frames[i]
}
