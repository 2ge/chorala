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
const OPTIONS: Theme[] = [AUTO, ...THEMES]

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

export function ThemeSwitcher({ initial = 'paper' }: { initial?: string }) {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState(initial)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function pick(id: string) {
    setCurrent(id)
    setOpen(false)
    if (id === 'auto') {
      delete document.documentElement.dataset.theme // follow prefers-color-scheme
      document.cookie = 'chorala-theme=; path=/; max-age=0; samesite=lax'
      try {
        localStorage.removeItem('chorala-theme')
      } catch {
        /* ignore */
      }
      return
    }
    document.documentElement.dataset.theme = id
    try {
      localStorage.setItem('chorala-theme', id)
    } catch {
      /* ignore */
    }
    document.cookie = `chorala-theme=${id}; path=/; max-age=31536000; samesite=lax`
  }

  const active = OPTIONS.find((t) => t.id === current) ?? AUTO

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
        <div className="surface absolute right-0 z-50 mt-2 w-44 overflow-hidden p-1.5">
          <p className="px-2.5 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
            Theme
          </p>
          {OPTIONS.map((t) => (
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
        </div>
      )}
    </div>
  )
}
