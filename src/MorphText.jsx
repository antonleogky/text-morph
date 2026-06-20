import { useEffect, useState } from 'react'
import { buildMorph, glyphFrame, SOURCE_FONTS } from './morph.js'

const BOX = { boxW: 880, boxH: 250, cx: 500, cy: 185 }

/**
 * Recreates the ravalabs.com footer wordmark: the typed text drawn in a
 * sequence of display fonts (readable -> heavy -> death-metal) and fluidly
 * *path-morphed* between them as the slider drags. A real glyph-outline tween,
 * not a crossfade or a filter.
 */
export default function MorphText({ text = 'HARDCORE', t = 0, fontFamily = 'Inter', svgRef }) {
  const [morph, setMorph] = useState(null)

  // Rebuild the per-glyph tweens only when text or the start font changes;
  // dragging the slider just re-evaluates them at a new position.
  useEffect(() => {
    let cancelled = false
    buildMorph(fontFamily, text, BOX)
      .then((m) => {
        if (!cancelled) setMorph(m)
      })
      .catch(() => {
        if (!cancelled) setMorph(null)
      })
    return () => {
      cancelled = true
    }
  }, [text, fontFamily])

  const pos = Math.min(1, Math.max(0, t))
  const cssFamily = (SOURCE_FONTS[fontFamily] ?? SOURCE_FONTS.Inter).css

  return (
    <svg
      ref={svgRef}
      className="morph-svg text-foreground"
      viewBox="0 0 1000 360"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={text}
    >
      {morph ? (
        <g fill="currentColor" fillRule="nonzero">
          {morph.glyphs.map((glyph, i) => {
            const d = glyphFrame(glyph, morph.frames, pos)
            return d ? <path key={i} d={d} /> : null
          })}
        </g>
      ) : (
        // Fallback while the fonts load: plain readable text, no flash.
        <text
          x={BOX.cx}
          y={BOX.cy}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontFamily: cssFamily, fontWeight: 600, fontSize: 150, fill: 'currentColor' }}
        >
          {text}
        </text>
      )}
    </svg>
  )
}
