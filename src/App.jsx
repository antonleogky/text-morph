import { useState } from 'react'
import MorphText from './MorphText.jsx'

const FONTS = [
  { label: 'Oswald', value: 'Oswald, sans-serif' },
  { label: 'Anton', value: '"Anton", sans-serif' },
  { label: 'Cinzel', value: '"Cinzel", serif' },
  { label: 'Inter', value: '"Inter", sans-serif' },
]

export default function App() {
  const [text, setText] = useState('RAVA LABS')
  const [brutality, setBrutality] = useState(0) // 0..100 -> drives the morph
  const [seed, setSeed] = useState(7)
  const [font, setFont] = useState(FONTS[0].value)

  const t = brutality / 100

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">text-morph</span>
        <span className="tag">readable → hardcore</span>
      </header>

      <main className="stage">
        <MorphText text={text || ' '} t={t} seed={seed} fontFamily={font} />
      </main>

      <section className="panel">
        <label className="field text-field">
          <span className="field-label">Text</span>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type something…"
            spellCheck={false}
          />
        </label>

        <label className="field">
          <span className="field-label">
            Brutality <b>{brutality}</b>
          </span>
          <input
            className="slider big"
            type="range"
            min="0"
            max="100"
            value={brutality}
            onChange={(e) => setBrutality(Number(e.target.value))}
          />
        </label>

        <div className="row">
          <label className="field font-field">
            <span className="field-label">Base font</span>
            <select value={font} onChange={(e) => setFont(e.target.value)}>
              {FONTS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>

          <button className="ghost" onClick={() => setSeed((s) => (s % 9999) + 1)}>
            ⤫ randomize spikes
          </button>
        </div>

        <p className="hint">
          Drag <b>Brutality</b> from 0 → 100: the same letters stay put and grow thorns,
          warp, and thicken into a hardcore-band logo.
        </p>
      </section>
    </div>
  )
}
