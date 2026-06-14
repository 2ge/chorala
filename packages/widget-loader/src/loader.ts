/**
 * Heed widget loader — the tiny (<2KB) snippet a host site embeds.
 *
 * It defines `window.Heed` as a command queue, async-loads `widget.js`, and the real
 * widget (once loaded) replays the queued commands. Usage on a host page:
 *
 *   <script src="https://cdn.example.com/loader.js"
 *           data-heed-cdn="https://api.example.com/widget.js"></script>
 *   <script>Heed('init', { projectKey: 'pk_live_xxx', locale: 'auto' });</script>
 *
 * The widget.js URL is read from this script tag's `data-heed-cdn` attribute, or from
 * `window.HeedWidgetUrl`, defaulting to `/widget.js` on the loader's own origin.
 */
type HeedQueue = { (...args: unknown[]): void; q?: unknown[][] }

declare global {
  interface Window {
    Heed?: HeedQueue
    HeedWidgetUrl?: string
  }
}

;(function bootstrap(w: Window, d: Document) {
  if (w.Heed) return // already loaded

  const queue: unknown[][] = []
  const heed: HeedQueue = (...args: unknown[]) => {
    queue.push(args)
  }
  heed.q = queue
  w.Heed = heed

  const current = d.currentScript as HTMLScriptElement | null
  const fromAttr = current?.getAttribute('data-heed-cdn') || undefined
  const fromOrigin = current?.src ? new URL('/widget.js', current.src).href : '/widget.js'
  const url = w.HeedWidgetUrl || fromAttr || fromOrigin

  const s = d.createElement('script')
  s.async = true
  s.src = url
  d.head.appendChild(s)
})(window, document)

export {}
