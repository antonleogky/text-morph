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
 * Build the death-metal plan for `text` in source font `fontKey`. Async (the
 * font is fetched). Returns:
 *   - glyphs:  each with its body contours (for the heavier letter mass) and a
 *              list of curved tendril spikes raking off the silhouette
 *   - wings:   big mirrored tendril fans flanking the first and last letters
 *   - inflate: how much the body thickens at full brutality
 * Spikes/wings are described once; rendering just scales them by `amount`, so
 * dragging the slider grows the whole logo smoothly and reversibly.
 */
export async function buildLogo(fontKey, text, box, seed) {
  const source = SOURCE_FONTS[fontKey] ?? SOURCE_FONTS.Inter
  const font = await loadFont(source.url)
  const { fontSize, paths } = layoutGlyphs(font, text, box)

  const rnd = mulberry32((seed || 1) * 0x9e3779b1)
  const spacing = fontSize * 0.05
  const inflate = fontSize * 0.075 // heavier letter mass, but letters stay apart
  const maxThorn = fontSize * 0.95
  const baseW = fontSize * 0.055
  const spikeGap = fontSize * 0.13 // arc distance between thorns — deliberate, not dense

  // Flatten + resample every glyph, find its outer silhouette, and the word's
  // overall bounds + far-left/right anchor points (where the wings attach).
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  let leftA = null
  let rightA = null
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
        if (!leftA || p.x < leftA.x) leftA = p
        if (!rightA || p.x > rightA.x) rightA = p
      }
    })
    return { contours, outer }
  })

  const midY = (minY + maxY) / 2
  const halfH = (maxY - minY) / 2 || 1

  const glyphs = prepared.map(({ contours, outer }) => {
    const bodyContours = contours.map((pts) => {
      const c = centroidOf(pts)
      const n = pts.length
      return pts.map((p, i) => {
        const prev = pts[(i - 1 + n) % n]
        const next = pts[(i + 1) % n]
        let nx = next.y - prev.y
        let ny = -(next.x - prev.x)
        const nl = Math.hypot(nx, ny) || 1
        nx /= nl
        ny /= nl
        if (nx * (p.x - c.x) + ny * (p.y - c.y) < 0) {
          nx = -nx
          ny = -ny
        }
        return { x: p.x, y: p.y, nx, ny }
      })
    })

    // Thorns rise off the outer silhouette, spaced out by arc length, favouring
    // the top and bottom edges (rakes + drips) over the vertical sides.
    const pts = contours[outer]
    const c = centroidOf(pts)
    const n = pts.length
    const spikes = []
    let acc = spikeGap
    for (let i = 0; i < n; i++) {
      const p = pts[i]
      const prev = pts[(i - 1 + n) % n]
      const next = pts[(i + 1) % n]
      acc += Math.hypot(p.x - prev.x, p.y - prev.y)

      let nx = next.y - prev.y
      let ny = -(next.x - prev.x)
      const nl = Math.hypot(nx, ny) || 1
      nx /= nl
      ny /= nl
      if (nx * (p.x - c.x) + ny * (p.y - c.y) < 0) {
        nx = -nx
        ny = -ny
      }

      const onCap = Math.abs(ny) > 0.4 // top or bottom edge
      if (acc < spikeGap || !onCap) continue
      acc = 0

      const r = rnd()
      const up = p.y < midY
      // rake direction: strongly vertical away from the midline, slight lean
      let dx = nx * 0.35
      let dy = up ? -1 : 1
      const dl = Math.hypot(dx, dy) || 1
      dx /= dl
      dy /= dl

      const extreme = Math.min(1, Math.abs(p.y - midY) / halfH)
      const len = maxThorn * (0.28 + r * r * 0.72) * (0.45 + 0.65 * extreme)
      // curve sweeps outward from the word centre, so the two halves mirror.
      const curve = (p.x < (minX + maxX) / 2 ? -1 : 1) * (0.12 + r * 0.22)
      spikes.push({ x: p.x, y: p.y, nx, ny, dx, dy, len, width: baseW, curve })
    }

    return { bodyContours, spikes }
  })

  // Mirrored wing fans at the far ends — the big symmetric flourishes that read
  // as a death-metal logo. Each is a splayed cluster of long curved tendrils.
  const wings = []
  const addWing = (anchor, sign) => {
    if (!anchor) return
    const ax = anchor.x
    // Tendrils originate at *staggered* heights along the end of the word and
    // all curl up-and-outward in the same direction, so the cluster reads as a
    // swept antler/branch flourish rather than a radial starburst. The last
    // ray is a downward drip.
    const rays = [
      { atY: -0.75, deg: -52, len: 1.85, w: 2.4, curve: 0.55 },
      { atY: -0.3, deg: -34, len: 2.1, w: 2.9, curve: 0.6 }, // main sweep
      { atY: 0.15, deg: -16, len: 1.6, w: 2.1, curve: 0.55 },
      { atY: 0.7, deg: 52, len: 1.4, w: 1.8, curve: 0.22 }, // drip
    ]
    rays.forEach((ray) => {
      const a = (ray.deg * Math.PI) / 180
      const dx = sign * Math.cos(a)
      const dy = Math.sin(a)
      wings.push({
        x: ax,
        y: midY + ray.atY * halfH,
        nx: dx,
        ny: dy,
        dx,
        dy,
        len: maxThorn * ray.len,
        width: baseW * ray.w,
        curve: sign * ray.curve, // hook outward so the antlers curl
      })
    })
  }
  addWing(leftA, -1)
  addWing(rightA, 1)

  return { glyphs, wings, inflate }
}

// A single curved, tapering tendril, grown to `amount`. Two quadratic curves
// sweep from a small base out to a sharp tip with a lateral hook, so it reads
// as an organic thorn/branch rather than a straight triangle.
function tendrilPath(s, amount, inflate) {
  const L = s.len * amount
  if (L < 0.5) return ''
  const bx = s.x + s.nx * inflate * amount
  const by = s.y + s.ny * inflate * amount
  const w = s.width * (0.5 + 0.5 * amount)
  // perpendicular to the thorn direction = its base orientation
  const px = -s.dy
  const py = s.dx
  const blx = bx - px * w
  const bly = by - py * w
  const brx = bx + px * w
  const bry = by + py * w
  const sweep = s.curve * L
  const tx = bx + s.dx * L + px * sweep
  const ty = by + s.dy * L + py * sweep
  // control points ~55% out, pulled toward the centreline to taper the tip
  const ox = bx + s.dx * L * 0.55 + px * sweep * 0.5
  const oy = by + s.dy * L * 0.55 + py * sweep * 0.5
  const cw = w * 0.4
  return (
    `M${blx.toFixed(1)} ${bly.toFixed(1)} ` +
    `Q${(ox - px * cw).toFixed(1)} ${(oy - py * cw).toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)} ` +
    `Q${(ox + px * cw).toFixed(1)} ${(oy + py * cw).toFixed(1)} ${brx.toFixed(1)} ${bry.toFixed(1)} Z `
  )
}

// Render one glyph: the (thickened) letter body plus its curved thorns.
export function renderGlyph(glyph, amount, inflate) {
  let d = ''
  for (const contour of glyph.bodyContours) {
    for (let i = 0; i < contour.length; i++) {
      const v = contour[i]
      const off = inflate * amount
      d += `${i === 0 ? 'M' : 'L'}${(v.x + v.nx * off).toFixed(1)} ${(v.y + v.ny * off).toFixed(1)} `
    }
    d += 'Z '
  }
  if (amount > 0.001) {
    for (const s of glyph.spikes) d += tendrilPath(s, amount, inflate)
  }
  return d
}

// Render the mirrored wing fans flanking the word.
export function renderWings(wings, amount, inflate) {
  if (amount <= 0.001) return ''
  let d = ''
  for (const s of wings) d += tendrilPath(s, amount, inflate)
  return d
}
