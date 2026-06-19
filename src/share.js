// Shareable state helpers: encode the current morph into the URL hash so a
// configuration is fully reproducible from a link, and export the rendered
// wordmark as a standalone SVG file.

const FIELDS = ['text', 'brutality', 'seed', 'font']

/** Read morph state from `location.hash` (e.g. #text=RAVA&brutality=70). */
export function readStateFromHash() {
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash) return null

  const params = new URLSearchParams(hash)
  const state = {}
  if (params.has('text')) state.text = params.get('text')
  if (params.has('brutality')) {
    const b = Number(params.get('brutality'))
    if (Number.isFinite(b)) state.brutality = Math.min(100, Math.max(0, b))
  }
  if (params.has('seed')) {
    const s = Number(params.get('seed'))
    if (Number.isFinite(s)) state.seed = s
  }
  if (params.has('font')) state.font = params.get('font')

  return Object.keys(state).length ? state : null
}

/** Serialize morph state into the URL hash without adding a history entry. */
export function writeStateToHash(state) {
  const params = new URLSearchParams()
  for (const key of FIELDS) {
    if (state[key] != null) params.set(key, String(state[key]))
  }
  const next = `#${params.toString()}`
  window.history.replaceState(null, '', next)
}

/**
 * Turn the live `<svg>` element into a self-contained SVG string with the
 * morph's fill baked in, then trigger a download.
 */
export function downloadSvg(svgEl, filename = 'text-morph.svg') {
  if (!svgEl) return

  const clone = svgEl.cloneNode(true)
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

  const source = new XMLSerializer().serializeToString(clone)
  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
