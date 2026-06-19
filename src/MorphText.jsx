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
 * toward an intentionally illegible death-metal logo (t=1) as the slider drags.
 *
 * The morph is purely geometric (same glyphs, distorted) so it reads as a true
 * transformation rather than a crossfade between two fonts. Four stacked
 * displacement passes plus an alpha crush build the extreme-metal aesthetic:
 *   1. feMorphology dilate fuses strokes into a heavy, calcified bone weight
 *   2. a coarse turbulence warp bends the overall silhouette
 *   3. a mid-frequency pass tangles strokes into thorny branches
 *   4. a fine, high-amplitude pass grows the sharp radiating spikes
 *   5. feComponentTransfer crushes the soft edges into crisp, high-contrast
 *      vector spikes (white on solid black)
 * Per-glyph rotation adds the chaotic tilt of band artwork.
 */
export default function MorphText({
  text = 'HARDCORE',
  t = 0,
  seed = 1,
  fontFamily = 'Inter, sans-serif',
  svgRef,
}) {
  const rawId = useId().replace(/:/g, '')
  const filterId = `morph-${rawId}`

  // Ease the brutality so the lower half of the slider stays legible and the
  // distortion detonates toward the top.
  const e = t * t // scales ramp in slowly
  const e3 = t * t * t // the finest thorns appear only near the very top

  // 1. heavy metal weight — thicken so strokes fuse into a solid mass and the
  //    spikes stay connected to it instead of scattering into grain
  const dilate = lerp(0, 2.6, e)

  // 2. coarse warp of the overall silhouette
  const coarseFreq = lerp(0.008, 0.018, t)
  const coarseScale = lerp(0, 24, e)

  // 3. low-frequency tangle that bends whole strokes into thorny branches
  const branchFreq = lerp(0.02, 0.05, t)
  const branchScale = lerp(0, 30, e)

  // 4. low-frequency, high-amplitude pass that pulls the edges out into long,
  //    sharp, connected spikes. Keeping the frequency low is what makes them
  //    read as thorns rather than dissolving into granular spray.
  const spikeFreq = lerp(0.04, 0.085, t)
  const spikeScale = lerp(0, 30, e)

  // 5. crush displaced anti-aliased edges into crisp, high-contrast vector
  //    spikes (slope 1 leaves the clean text untouched at t=0)
  const sharpen = lerp(1, 4, e)
  const sharpenIntercept = 0.5 * (1 - sharpen)

  // Weight + tracking shift to sell the thickening; letters tighten and tangle.
  const weight = Math.round(lerp(400, 800, t))
  const tracking = lerp(0.02, -0.08, t)

  // Per-glyph rotation list (SVG <text rotate="..."> rotates each glyph).
  const rotate = useMemo(() => {
    const rnd = mulberry32(seed * 2654435761)
    return Array.from(text, () => (rnd() - 0.5) * 52 * e)
      .map((n) => n.toFixed(2))
      .join(' ')
  }, [text, seed, e])

  return (
    <svg
      ref={svgRef}
      className="morph-svg text-foreground"
      viewBox="0 0 1000 320"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={text}
    >
      <defs>
        <filter
          id={filterId}
          x="-50%"
          y="-65%"
          width="200%"
          height="230%"
          primitiveUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feMorphology operator="dilate" radius={dilate} in="SourceGraphic" result="thick" />

          <feTurbulence
            type="turbulence"
            baseFrequency={coarseFreq}
            numOctaves="3"
            seed={seed + 17}
            result="coarseNoise"
          />
          <feDisplacementMap
            in="thick"
            in2="coarseNoise"
            scale={coarseScale}
            xChannelSelector="R"
            yChannelSelector="G"
            result="warped"
          />

          <feTurbulence
            type="fractalNoise"
            baseFrequency={branchFreq}
            numOctaves="3"
            seed={seed + 9}
            result="branchNoise"
          />
          <feDisplacementMap
            in="warped"
            in2="branchNoise"
            scale={branchScale}
            xChannelSelector="R"
            yChannelSelector="G"
            result="branched"
          />

          <feTurbulence
            type="turbulence"
            baseFrequency={spikeFreq}
            numOctaves="2"
            seed={seed}
            result="spikeNoise"
          />
          <feDisplacementMap
            in="branched"
            in2="spikeNoise"
            scale={spikeScale}
            xChannelSelector="R"
            yChannelSelector="G"
            result="spiked"
          />

          <feComponentTransfer in="spiked">
            <feFuncA type="linear" slope={sharpen} intercept={sharpenIntercept} />
          </feComponentTransfer>
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
          fill: 'currentColor',
        }}
      >
        {text}
      </text>
    </svg>
  )
}
