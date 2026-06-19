import { useId, useMemo } from 'react'

// Cheap deterministic PRNG so a given `seed` always produces the same chaos.
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const lerp = (a, b, t) => a + (b - a) * t

/**
 * Renders `text` as SVG and continuously morphs it from clean & readable (t=0)
 * toward a gnarly, spiked hardcore / death-metal logo (t=1).
 *
 * The morph is purely geometric (same glyphs, distorted) so it reads as a true
 * transformation rather than a crossfade between two fonts:
 *   - a coarse turbulence displacement warps the overall silhouette
 *   - a fine, high-frequency displacement grows the thorny spikes
 *   - feMorphology thickens the strokes into a heavy metal weight
 *   - per-glyph rotation jitter adds the chaotic tilt of band logos
 */
export default function MorphText({
  text = 'HARDCORE',
  t = 0,
  seed = 1,
  fontFamily = 'Oswald, sans-serif',
}) {
  const rawId = useId().replace(/:/g, '')
  const filterId = `morph-${rawId}`

  // Ease the brutality so the bottom of the slider stays readable and the
  // spikes really kick in toward the top.
  const e = t * t
  const e3 = t * t * t

  const coarseScale = lerp(0, 34, e)
  const coarseFreq = lerp(0.008, 0.03, t)
  const fineScale = lerp(0, 16, e3)
  const fineFreq = lerp(0.25, 0.55, t)
  const dilate = lerp(0, 1.4, e)

  // Weight + tracking shift to sell the "tightening / thickening" of the morph.
  const weight = Math.round(lerp(300, 700, t))
  const tracking = lerp(0.04, -0.06, t)

  // Per-glyph rotation list (SVG <text rotate="..."> rotates each glyph).
  const rotate = useMemo(() => {
    const rnd = mulberry32(seed * 2654435761)
    return Array.from(text, () => (rnd() - 0.5) * 46 * e)
      .map((n) => n.toFixed(2))
      .join(' ')
  }, [text, seed, e])

  return (
    <svg
      className="morph-svg"
      viewBox="0 0 1000 320"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={text}
    >
      <defs>
        <filter
          id={filterId}
          x="-30%"
          y="-40%"
          width="160%"
          height="180%"
          primitiveUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feMorphology operator="dilate" radius={dilate} in="SourceGraphic" result="thick" />
          <feTurbulence
            type="fractalNoise"
            baseFrequency={fineFreq}
            numOctaves="2"
            seed={seed}
            result="fineNoise"
          />
          <feDisplacementMap
            in="thick"
            in2="fineNoise"
            scale={fineScale}
            xChannelSelector="R"
            yChannelSelector="G"
            result="thorns"
          />
          <feTurbulence
            type="turbulence"
            baseFrequency={coarseFreq}
            numOctaves="3"
            seed={seed + 17}
            result="coarseNoise"
          />
          <feDisplacementMap
            in="thorns"
            in2="coarseNoise"
            scale={coarseScale}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>

      <text
        x="500"
        y="170"
        textAnchor="middle"
        dominantBaseline="middle"
        rotate={rotate}
        filter={`url(#${filterId})`}
        style={{
          fontFamily,
          fontWeight: weight,
          fontSize: 168,
          letterSpacing: `${tracking}em`,
          fill: '#f5f5f5',
        }}
      >
        {text}
      </text>
    </svg>
  )
}
