import { useId } from 'react'

const lerp = (a, b, t) => a + (b - a) * t
const clamp01 = (n) => Math.min(1, Math.max(0, n))

/**
 * Morphs `text` from clean & readable (t=0) into a real death-metal logotype
 * (t=1) as the slider drags. The brutal end is the genuine spiked lettering of
 * the bundled Sagerange typeface — the only way to get the sharp, thorny font
 * spikes of band logos, which pure SVG filters can't fake.
 *
 * Two layers sit centered in the same spot so the wordmark never jumps:
 *   - the readable text in the selected font, fading + blurring out
 *   - the same text in the death-metal font, fading in from a blur
 * A shared turbulence displacement warps both layers, peaking mid-drag and
 * resolving to zero at t=1 so the final logo lands crisp like the references.
 */
export default function MorphText({
  text = 'HARDCORE',
  t = 0,
  seed = 1,
  fontFamily = 'Inter, sans-serif',
  svgRef,
}) {
  const rawId = useId().replace(/:/g, '')
  const warpId = `warp-${rawId}`

  // Distortion is a bell curve: nothing at the clean end, chaos through the
  // middle of the drag, then crisp again as the death-metal font resolves.
  const bell = Math.sin(clamp01(t) * Math.PI)
  const warpScale = bell * 20
  const warpFreq = lerp(0.018, 0.05, t)

  // Complementary crossfade through the [a, b] handoff window: the two layers'
  // opacities always sum to 1, so brightness stays constant (no dim, foggy
  // double-exposure) while the shared warp scrambles both into the morph.
  // Below a it's pure readable text; above b it's the pure death-metal font
  // resolving from warped to crisp as the displacement falls back to zero.
  const a = 0.28
  const b = 0.62
  const blend = clamp01((t - a) / (b - a))
  const readable = 1 - blend
  const metal = blend
  const readableBlur = (1 - readable) * 1.5
  const metalBlur = (1 - metal) * 2.5

  return (
    <svg
      ref={svgRef}
      className="morph-svg text-foreground"
      viewBox="0 0 1000 360"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={text}
    >
      <defs>
        <filter
          id={warpId}
          x="-60%"
          y="-70%"
          width="220%"
          height="240%"
          primitiveUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="turbulence"
            baseFrequency={warpFreq}
            numOctaves="3"
            seed={seed}
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={warpScale}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>

      {/* readable base, fading + blurring out */}
      <text
        x="500"
        y="185"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontFamily,
          fontWeight: 600,
          fontSize: 150,
          fill: 'currentColor',
          opacity: readable,
          filter: `url(#${warpId}) blur(${readableBlur}px)`,
        }}
      >
        {text}
      </text>

      {/* death-metal logotype, resolving in from a blur */}
      <text
        x="500"
        y="185"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontFamily: '"Sagerange", sans-serif',
          fontSize: 150,
          fill: 'currentColor',
          opacity: metal,
          filter: `url(#${warpId}) blur(${metalBlur}px)`,
        }}
      >
        {text}
      </text>
    </svg>
  )
}
