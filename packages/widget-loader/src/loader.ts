/**
 * Chorala widget loader — the tiny (<2KB) snippet a host site embeds.
 *
 * It defines `window.Chorala` as a command queue, async-loads `widget.js`, and the real
 * widget (once loaded) replays the queued commands. Usage on a host page:
 *
 *   <script src="https://cdn.example.com/loader.js"
 *           data-chorala-cdn="https://api.example.com/widget.js"></script>
 *   <script>Chorala('init', { projectKey: 'pk_live_xxx', locale: 'auto' });</script>
 *
 * The widget.js URL is read from this script tag's `data-chorala-cdn` attribute, or from
 * `window.ChoralaWidgetUrl`, defaulting to `/widget.js` on the loader's own origin.
 *
 * Back-compat: `window.Heed` / `HeedWidgetUrl` / `data-heed-cdn` remain supported aliases
 * so existing embeds (e.g. MusicAha's deployed page) keep working unchanged.
 */
type CmdQueue = { (...args: unknown[]): void; q?: unknown[][] }

declare global {
  interface Window {
    Chorala?: CmdQueue
    ChoralaWidgetUrl?: string
    Heed?: CmdQueue // legacy alias
    HeedWidgetUrl?: string // legacy alias
  }
}

;(function bootstrap(w: Window, d: Document) {
  if (w.Chorala || w.Heed) return // already loaded

  const queue: unknown[][] = []
  const fn: CmdQueue = (...args: unknown[]) => {
    queue.push(args)
  }
  fn.q = queue
  w.Chorala = fn
  w.Heed = fn // legacy alias: same queue

  const current = d.currentScript as HTMLScriptElement | null
  const fromAttr =
    current?.getAttribute('data-chorala-cdn') || current?.getAttribute('data-heed-cdn') || undefined
  const fromOrigin = current?.src ? new URL('/widget.js', current.src).href : '/widget.js'
  const url = w.ChoralaWidgetUrl || w.HeedWidgetUrl || fromAttr || fromOrigin

  const s = d.createElement('script')
  s.async = true
  s.src = url
  d.head.appendChild(s)
})(window, document)

export {}
