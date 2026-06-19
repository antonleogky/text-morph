import { useEffect, useState } from 'react'
import { buildLogo, renderGlyph, SOURCE_FONTS } from './morph.js'

const BOX = { boxW: 860, boxH: 240, cx: 500, cy: 185 }

/**
 * Renders `text` and morphs it from a clean, readable wordmark (t=0) into a
 * procedurally-spiked death-metal logo (t=1) as the slider drags: thorns, rakes
 * and drips grow out of the letter outlines themselves — a real geometric
 * transformation, not a font swap or a crossfade.
 */
export default function MorphText({
  text = 'HARDCORE',
  t = 0,
  seed = 1,
  fontFamily = 'Inter',
  svgRef,
}) {
  const [logo, setLogo] = useState(null)

  // Rebuild the spike plan only when text, source font, or seed changes;
  // dragging the slider just re-evaluates it at a new growth amount.
  useEffect(() => {
    let cancelled = false
    buildLogo(fontFamily, text, BOX, seed)
      .then((l) => {
        if (!cancelled) setLogo(l)
      })
      .catch(() => {
        if (!cancelled) setLogo(null)
      })
    return () => {
      cancelled = true
    }
  }, [text, fontFamily, seed])

  // Ease so the lower half of the slider stays legible and the thorns really
  // take over toward the top.
  const amount = Math.pow(Math.min(1, Math.max(0, t)), 1.25)
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
      {logo ? (
        <g fill="currentColor" fillRule="nonzero">
          {logo.glyphs.map((glyph, i) => (
            <path key={i} d={renderGlyph(glyph, amount, logo.inflate)} />
          ))}
        </g>
      ) : (
        // Fallback while the font loads: plain readable text, no flash.
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
