// Procedural death-metal logo engine.
//
// Takes the readable letter outlines and *grows* the genre's signature spikes
// out of their edges — calibrated thorns, upward rakes, and downward drips —
// the way death-metal logos are actually built (gothic letterforms pushed to
// their limits with serrations and spikes). At brutality 0 the outline is the
// clean letter; as it rises, every thorn extends from zero, so it's a true
// geometric morph that stays readable low and turns brutal/illegible high.

import { parse as parseFont } from 'opentype.js'

import InterUrl from './fonts/Inter.woff?url'
import GeistUrl from './fonts/Geist.woff?url'
import IBMPlexSansUrl from './fonts/IBMPlexSans.woff?url'
import GoogleSansUrl from './fonts/GoogleSans.ttf?url'
import InstrumentSerifUrl from './fonts/InstrumentSerif.woff?url'

// The readable base fonts the spikes grow out of (key -> file + CSS family).
export const SOURCE_FONTS = {
  Inter: { url: InterUrl, css: '"Inter", sans-serif' },
  Geist: { url: GeistUrl, css: '"Geist", sans-serif' },
  'IBM Plex Sans': { url: IBMPlexSansUrl, css: '"IBM Plex Sans", sans-serif' },
  'Google Sans': { url: GoogleSansUrl, css: '"Google Sans", sans-serif' },
  'Instrument Serif': { url: InstrumentSerifUrl, css: '"Instrument Serif", serif' },
}

// Deterministic PRNG so a given seed always grows the same thorns.
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let x = Math.imul(a ^ (a >>> 15), 1 | a)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

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

// Flatten an opentype path into closed contours of {x, y} points.
function flattenPath(path) {
  const contours = []
  let cur = null
  let x0 = 0
  let y0 = 0

  const sampleQuad = (cx, cy, ex, ey, steps) => {
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      const u = 1 - t
      cur.push({
        x: u * u * x0 + 2 * u * t * cx + t * t * ex,
        y: u * u * y0 + 2 * u * t * cy + t * t * ey,
      })
    }
  }
  const sampleCubic = (c1x, c1y, c2x, c2y, ex, ey, steps) => {
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      const u = 1 - t
      cur.push({
        x: u * u * u * x0 + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * ex,
        y: u * u * u * y0 + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * ey,
      })
    }
  }

  for (const cmd of path.commands) {
    if (cmd.type === 'M') {
      cur = [{ x: cmd.x, y: cmd.y }]
      contours.push(cur)
      x0 = cmd.x
      y0 = cmd.y
    } else if (cmd.type === 'L') {
      cur.push({ x: cmd.x, y: cmd.y })
      x0 = cmd.x
      y0 = cmd.y
    } else if (cmd.type === 'Q') {
      sampleQuad(cmd.x1, cmd.y1, cmd.x, cmd.y, 10)
      x0 = cmd.x
      y0 = cmd.y
    } else if (cmd.type === 'C') {
      sampleCubic(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y, 12)
      x0 = cmd.x
      y0 = cmd.y
    }
    // 'Z' just closes; contour is already its own loop
  }
  return contours.filter((c) => c.length >= 3)
}

// Walk a closed contour and drop points at a roughly uniform spacing, so the
// thorns end up evenly distributed regardless of the font's point density.
function resampleClosed(pts, spacing) {
  const out = []
  let carry = 0
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    let dx = b.x - a.x
    let dy = b.y - a.y
    const len = Math.hypot(dx, dy)
    if (len < 1e-6) continue
    dx /= len
    dy /= len
    let d = carry
    while (d < len) {
      out.push({ x: a.x + dx * d, y: a.y + dy * d })
      d += spacing
    }
    carry = d - len
  }
  return out.length >= 3 ? out : pts
}

const centroidOf = (pts) => {
  let cx = 0
  let cy = 0
  for (const p of pts) {
    cx += p.x
    cy += p.y
  }
  return { x: cx / pts.length, y: cy / pts.length }
}

// Signed area of a closed contour (shoelace); magnitude ranks outer vs. counter.
const shoelace = (pts) => {
  let sum = 0
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    sum += a.x * b.y - b.x * a.y
  }
  return sum / 2
}

// Lay the word out centered + scaled to fit the box, returning each glyph's
// opentype Path. Char-by-char (charToGlyph) avoids opentype's GSUB/Bidi engine,
// which throws on some display fonts.
function layoutGlyphs(font, text, { boxW, boxH, cx, cy }) {
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
  const fontSize = base * scale
  const offX = cx - ((minX + maxX) / 2) * scale
  const offY = cy - ((minY + maxY) / 2) * scale

  return {
    fontSize,
    paths: placed.map(({ glyph, x }) => glyph.getPath(x * scale + offX, offY, fontSize)),
  }
}

/**
 * Build the spike plan for `text` in source font `fontKey`. Async (fetches the
 * font). Returns per-glyph contours where every vertex carries its base point,
 * an outward unit direction, and a thorn magnitude (0 = no thorn). Rendering is
 * then just `base + dir * mag * amount` — cheap enough to run every frame.
 */
export async function buildLogo(fontKey, text, box, seed) {
  const source = SOURCE_FONTS[fontKey] ?? SOURCE_FONTS.Inter
  const font = await loadFont(source.url)
  const { fontSize, paths } = layoutGlyphs(font, text, box)

  const rnd = mulberry32((seed || 1) * 0x9e3779b1)
  const spacing = fontSize * 0.055
  const maxThorn = fontSize * 0.5
  const inflate = fontSize * 0.06

  // First pass: flatten + resample every glyph into contours of points, and
  // track which contour of each glyph is the outer silhouette (largest area)
  // plus the whole word's bounds — both drive how the thorns rake.
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  const prepared = paths.map((path) => {
    const contours = flattenPath(path).map((raw) => resampleClosed(raw, spacing))
    let outer = 0
    let outerArea = -1
    contours.forEach((pts, ci) => {
      const a = Math.abs(shoelace(pts))
      if (a > outerArea) {
        outerArea = a
        outer = ci
      }
      for (const p of pts) {
        if (p.x < minX) minX = p.x
        if (p.x > maxX) maxX = p.x
        if (p.y < minY) minY = p.y
        if (p.y > maxY) maxY = p.y
      }
    })
    return { contours, outer }
  })

  const midY = (minY + maxY) / 2
  const halfH = (maxY - minY) / 2 || 1
  const endBand = (maxX - minX) * 0.12 // how close to a word end counts as a "wing"

  const glyphs = prepared.map(({ contours, outer }) => ({
    contours: contours.map((pts, ci) => {
      const c = centroidOf(pts)
      const n = pts.length
      const spikeThis = ci === outer
      let lastSpike = -2

      return pts.map((p, i) => {
        const prev = pts[(i - 1 + n) % n]
        const next = pts[(i + 1) % n]
        // outward normal = perpendicular to the local tangent, flipped to point
        // away from the contour centre.
        let nx = next.y - prev.y
        let ny = -(next.x - prev.x)
        const nl = Math.hypot(nx, ny) || 1
        nx /= nl
        ny /= nl
        if (nx * (p.x - c.x) + ny * (p.y - c.y) < 0) {
          nx = -nx
          ny = -ny
        }

        let mag = 0
        let dx = nx
        let dy = ny
        // Only the outer silhouette grows thorns, kept isolated (skip a
        // neighbour) so they read as sharp single spikes.
        if (spikeThis && i > lastSpike + 1 && rnd() < 0.55) {
          lastSpike = i
          const r = rnd()
          // Rake: thorns lean strongly away from the word's vertical midline
          // (up on top, down/drip on the bottom) with a little outward lean —
          // this is what reads as a death-metal logo rather than a starburst.
          const up = p.y < midY
          dx = nx * 0.45
          dy = up ? -1 : 1
          if (!up) dx *= 0.5 // drips fall straighter

          // Big horizontal "wings" at the far left/right ends of the word.
          const nearEnd = Math.min(p.x - minX, maxX - p.x) < endBand
          let wing = 1
          if (nearEnd && Math.abs(nx) > 0.5) {
            dx = Math.sign(nx)
            dy = up ? -0.4 : 0.4
            wing = 1.9
          }
          const dl = Math.hypot(dx, dy) || 1
          dx /= dl
          dy /= dl

          // Longer toward the top/bottom extremes, short in the middle band.
          const extreme = Math.min(1, Math.abs(p.y - midY) / halfH)
          mag = maxThorn * (0.1 + r * r * 0.9) * (0.4 + extreme) * wing
        }

        return { x: p.x, y: p.y, nx, ny, dx, dy, mag }
      })
    }),
  }))

  return { glyphs, inflate }
}

// Render one glyph's contours at the given thorn amount (0..1) into a path
// string. Every vertex inflates slightly along its normal (heavier metal
// weight) and extends along its thorn direction.
export function renderGlyph(glyph, amount, inflate) {
  let d = ''
  for (const contour of glyph.contours) {
    for (let i = 0; i < contour.length; i++) {
      const v = contour[i]
      const grow = v.mag * amount
      const off = inflate * amount
      const x = v.x + v.nx * off + v.dx * grow
      const y = v.y + v.ny * off + v.dy * grow
      d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)} `
    }
    d += 'Z '
  }
  return d
}
