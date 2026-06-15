'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { THEMES, type Theme } from '@/lib/themes'

// "System" follows the OS (prefers-color-scheme); its swatch is split light/dark.
const AUTO: Theme = {
  id: 'auto',
  name: 'System',
  paper: 'linear-gradient(135deg, #f7f3ec 0 50%, #14120d 50% 100%)',
  accent: 'transparent',
  ink: '#9a948c',
}
const CUSTOM_DEFAULT = { paper: '#f7f3ec', ink: '#1c1815', accent: '#d9512a' }
type Custom = typeof CUSTOM_DEFAULT

function readCustom(): Custom {
  if (typeof document === 'undefined') return CUSTOM_DEFAULT
  try {
    const m = document.cookie.match(/(?:^|; )chorala-custom=([^;]*)/)
    if (m?.[1]) return { ...CUSTOM_DEFAULT, ...JSON.parse(decodeURIComponent(m[1])) }
  } catch {
    /* ignore */
  }
  return CUSTOM_DEFAULT
}

function Swatch({ t, ring }: { t: Theme; ring?: boolean }) {
  return (
    <span
      className={cn(
        'flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-black/10',
        ring && 'ring-2 ring-accent ring-offset-1 ring-offset-paper',
      )}
      style={{ background: t.paper }}
      aria-hidden
    >
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.accent }} />
    </span>
  )
}

export function ThemeSwitcher({ initial = 'auto' }: { initial?: string }) {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState(initial)
  const [custom, setCustom] = useState<Custom>(CUSTOM_DEFAULT)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCustom(readCustom())
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function applyCustom(c: Custom) {
    const el = document.documentElement
    el.dataset.theme = 'custom'
    el.style.setProperty('--c-paper', c.paper)
    el.style.setProperty('--c-ink', c.ink)
    el.style.setProperty('--c-accent', c.accent)
    document.cookie = `chorala-theme=custom; path=/; max-age=31536000; samesite=lax`
    document.cookie = `chorala-custom=${encodeURIComponent(JSON.stringify(c))}; path=/; max-age=31536000; samesite=lax`
    try {
      localStorage.setItem('chorala-theme', 'custom')
    } catch {
      /* ignore */
    }
  }

  function pick(id: string) {
    setCurrent(id)
    if (id !== 'custom') setOpen(false)
    if (id === 'custom') return applyCustom(custom)
    if (id === 'auto') {
      delete document.documentElement.dataset.theme // follow prefers-color-scheme
      document.documentElement.removeAttribute('style')
      document.cookie = 'chorala-theme=; path=/; max-age=0; samesite=lax'
      try {
        localStorage.removeItem('chorala-theme')
      } catch {
        /* ignore */
      }
      return
    }
    document.documentElement.dataset.theme = id
    document.documentElement.removeAttribute('style')
    document.cookie = `chorala-theme=${id}; path=/; max-age=31536000; samesite=lax`
    try {
      localStorage.setItem('chorala-theme', id)
    } catch {
      /* ignore */
    }
  }

  function setColor(key: keyof Custom, value: string) {
    const next = { ...custom, [key]: value }
    setCustom(next)
    applyCustom(next)
  }

  const customTheme: Theme = { id: 'custom', name: 'Custom', ...custom }
  const options: Theme[] = [AUTO, ...THEMES, customTheme]
  const active = options.find((t) => t.id === current) ?? AUTO

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Change theme"
        className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-line-strong bg-raised transition hover:border-ink-faint"
      >
        <Swatch t={active} />
      </button>
      {open && (
        <div className="surface absolute right-0 z-50 mt-2 w-48 overflow-hidden p-1.5">
          <p className="px-2.5 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
            Theme
          </p>
          {options.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => pick(t.id)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition',
                t.id === current ? 'bg-ink/[0.05] font-semibold' : 'hover:bg-ink/[0.04]',
              )}
            >
              <Swatch t={t} ring={t.id === current} />
              {t.name}
            </button>
          ))}
          {current === 'custom' && (
            <div className="mt-1 grid grid-cols-3 gap-1.5 border-t border-line px-2 pb-1 pt-2">
              {(['paper', 'ink', 'accent'] as const).map((k) => (
                <label
                  key={k}
                  className="flex flex-col items-center gap-1 text-[10px] text-ink-faint"
                >
                  <input
                    type="color"
                    value={custom[k]}
                    onChange={(e) => setColor(k, e.target.value)}
                    className="h-7 w-full cursor-pointer rounded-md border border-line bg-transparent"
                    aria-label={`Custom ${k} colour`}
                  />
                  {k === 'paper' ? 'Bg' : k === 'ink' ? 'Text' : 'Accent'}
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
