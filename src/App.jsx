import { useEffect, useRef, useState } from 'react'
import { Check, Download, Share2, Shuffle } from 'lucide-react'
import MorphText from './MorphText.jsx'
import { downloadSvg, readStateFromHash, writeStateToHash } from './share.js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const FONTS = [
  { label: 'Inter', value: '"Inter", sans-serif' },
  { label: 'Geist', value: '"Geist", sans-serif' },
  { label: 'IBM Plex Sans', value: '"IBM Plex Sans", sans-serif' },
  { label: 'Google Sans', value: '"Google Sans", sans-serif' },
  { label: 'Instrument Serif', value: '"Instrument Serif", serif' },
]

const initial = readStateFromHash() || {}

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
    <div className="flex min-h-screen flex-col">
      <header className="flex items-baseline gap-2 px-6 py-4 text-sm">
        <span className="font-semibold tracking-tight">text-morph</span>
        <span className="text-muted-foreground">readable → hardcore</span>
      </header>

      <main className="grid flex-1 place-items-center px-6 py-10">
        <MorphText text={text || ' '} t={t} seed={seed} fontFamily={font} svgRef={svgRef} />
      </main>

      <section className="border-t bg-card/30">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-6 py-6">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type something…"
            spellCheck={false}
            aria-label="Text"
          />

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Brutality
              </Label>
              <span className="text-sm tabular-nums text-muted-foreground">{brutality}</span>
            </div>
            <Slider
              value={[brutality]}
              onValueChange={([v]) => setBrutality(v)}
              min={0}
              max={100}
              step={1}
              aria-label="Brutality"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={font} onValueChange={setFont}>
              <SelectTrigger className="w-44" aria-label="Base font">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONTS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="ml-auto flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setSeed((s) => (s % 9999) + 1)}>
                <Shuffle />
                Randomize
              </Button>
              <Button variant="outline" size="sm" onClick={copyShareLink}>
                {copied ? <Check /> : <Share2 />}
                {copied ? 'Copied' : 'Share'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadSvg(svgRef.current, `${(text || 'text-morph').trim() || 'text-morph'}.svg`)
                }
              >
                <Download />
                Export
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
