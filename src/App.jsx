import { useEffect, useRef, useState } from 'react'
import MorphText from './MorphText.jsx'
import { downloadSvg, readStateFromHash, writeStateToHash } from './share.js'

const FONTS = [
  { label: 'Inter', value: '"Inter", sans-serif' },
  { label: 'Geist', value: '"Geist", sans-serif' },
  { label: 'IBM Plex Sans', value: '"IBM Plex Sans", sans-serif' },
  { label: 'Google Sans', value: '"Google Sans", sans-serif' },
  { label: 'Instrument Serif', value: '"Instrument Serif", serif' },
]

const initial = readStateFromHash() || {}

// One quiet ghost-button style, shared by every secondary action.
const button =
  'rounded-lg border border-neutral-800 px-3 py-2 text-sm text-neutral-300 ' +
  'transition duration-150 ease-out hover:border-neutral-600 hover:text-neutral-100 ' +
  'active:scale-[0.96]'

const field =
  'rounded-lg border border-neutral-800 bg-neutral-900 px-3.5 py-2.5 text-neutral-100 ' +
  'outline-none transition-colors duration-150 focus:border-neutral-500'

export default function App() {
  const [text, setText] = useState(initial.text ?? 'Metal text')
  const [brutality, setBrutality] = useState(initial.brutality ?? 0) // 0..100 -> drives the morph
  const [seed, setSeed] = useState(initial.seed ?? 7)
  const [font, setFont] = useState(initial.font ?? FONTS[0].value)
  const [copied, setCopied] = useState(false)
  const svgRef = useRef(null)

  const t = brutality / 100

  // Keep the URL hash in sync so the current morph is always shareable.
  useEffect(() => {
    writeStateToHash({ text, brutality, seed, font })
  }, [text, brutality, seed, font])

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard may be unavailable (e.g. insecure context); ignore silently.
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-neutral-100">
      <header className="flex items-baseline gap-2 px-6 py-4 text-sm">
        <span className="font-semibold tracking-tight">text-morph</span>
        <span className="text-neutral-500">readable → hardcore</span>
      </header>

      <main className="grid flex-1 place-items-center px-6 py-10">
        <MorphText text={text || ' '} t={t} seed={seed} fontFamily={font} svgRef={svgRef} />
      </main>

      <section className="border-t border-neutral-800 bg-neutral-900/40">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-6 py-6">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type something…"
            spellCheck={false}
            aria-label="Text"
            className={`${field} text-base`}
          />

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs uppercase tracking-widest text-neutral-500">
              <span>Brutality</span>
              <span className="tabular-nums text-neutral-300">{brutality}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={brutality}
              onChange={(e) => setBrutality(Number(e.target.value))}
              aria-label="Brutality"
              className="h-1.5 w-full cursor-pointer accent-red-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={font}
              onChange={(e) => setFont(e.target.value)}
              aria-label="Base font"
              className={`${field} text-sm`}
            >
              {FONTS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>

            <div className="ml-auto flex flex-wrap gap-2">
              <button className={button} onClick={() => setSeed((s) => (s % 9999) + 1)}>
                ⤫ Randomize
              </button>
              <button className={button} onClick={copyShareLink}>
                {copied ? '✓ Copied' : '↗ Share'}
              </button>
              <button
                className={button}
                onClick={() =>
                  downloadSvg(svgRef.current, `${(text || 'text-morph').trim() || 'text-morph'}.svg`)
                }
              >
                ↓ Export
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
