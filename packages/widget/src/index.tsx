import { type Api, createApi } from './api.ts'
import { resolveLocale } from './i18n.ts'
import { type Instance, mountWidget } from './mount.tsx'
import type { InitOptions, Mode, View, WidgetSettings } from './types.ts'

type Cmd = [string, ...unknown[]]
type EventCb = (payload?: unknown) => void

const listeners: Record<string, EventCb[]> = {}
let config: InitOptions | null = null
let instance: Instance | null = null
let ctx: { api: Api; locale: string; settings: WidgetSettings } | null = null

function emit(event: string, payload?: unknown) {
  for (const cb of listeners[event] ?? []) cb(payload)
}

/** Derive the public API base from the <script> that loaded widget.js (override via init.apiUrl). */
function detectApiBase(explicit?: string): string {
  if (explicit) return explicit.replace(/\/+$/, '')
  const scripts = Array.from(document.getElementsByTagName('script'))
  const self = scripts.find((s) => s.src && s.src.indexOf('widget.js') !== -1)
  const origin = self ? new URL(self.src).origin : location.origin
  return `${origin}/api/v1`
}

function buildApi(): Api | null {
  if (!config) return null
  const apiBase = detectApiBase(config.apiUrl)
  return createApi({ apiBase, projectKey: config.projectKey, jwt: config.user?.jwt })
}

function startInstance() {
  if (!config || !ctx) return
  const mode: Mode = ctx.settings.mode ?? 'floating'
  if (mode === 'inline') return // inline is created via render()
  instance?.destroy()
  instance = mountWidget({
    api: ctx.api,
    locale: ctx.locale,
    settings: ctx.settings,
    mode,
    defaultView: config.view ?? 'board',
  })
}

function handle(cmd: Cmd) {
  const [name, a1, a2] = cmd
  switch (name) {
    case 'init': {
      config = a1 as InitOptions
      if (!config?.projectKey) {
        console.error('[chorala] init requires { projectKey }')
        return
      }
      const api = buildApi()
      if (!api) return
      ctx = { api, locale: resolveLocale(config.locale), settings: config.settings ?? {} }
      startInstance()
      emit('ready')
      break
    }
    case 'identify': {
      if (config) config.user = a1 as { jwt?: string }
      const api = buildApi()
      if (api && ctx) {
        ctx = { ...ctx, api }
        startInstance()
      }
      break
    }
    case 'open':
      instance?.open(a1 as View | undefined)
      break
    case 'close':
      instance?.close()
      break
    case 'render': {
      const container = document.querySelector(a1 as string)
      const opts = (a2 ?? {}) as { view?: View }
      if (container && ctx) {
        mountWidget({
          api: ctx.api,
          locale: ctx.locale,
          settings: ctx.settings,
          mode: 'inline',
          defaultView: opts.view ?? 'board',
          container,
        })
      }
      break
    }
    case 'on': {
      const event = a1 as string
      const cb = a2 as EventCb
      if (!listeners[event]) listeners[event] = []
      listeners[event].push(cb)
      break
    }
    default:
      console.warn('[chorala] unknown command:', name)
  }
}

// Replace the loader's queue stub with the real processor and replay queued commands.
// Supports both the `Chorala` global and the legacy `Heed` alias (same queue).
const w = window as unknown as { Chorala?: { q?: unknown[][] }; Heed?: { q?: unknown[][] } }
const queued: unknown[][] = w.Chorala?.q ?? w.Heed?.q ?? []
const run = (...args: unknown[]) => handle(args as Cmd)
;(w as unknown as { Chorala: unknown; Heed: unknown }).Chorala = run
;(w as unknown as { Chorala: unknown; Heed: unknown }).Heed = run
for (const c of queued) handle(c as Cmd)
