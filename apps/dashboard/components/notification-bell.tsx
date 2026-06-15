'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

type Notif = {
  id: string
  type: string
  payload: { title?: string } | null
  readAt: string | null
  createdAt: string
}

function label(n: Notif) {
  const t = n.payload?.title ?? 'a post'
  switch (n.type) {
    case 'post.created':
      return `New idea: ${t}`
    case 'post.commented':
      return `New comment on “${t}”`
    default:
      return t
  }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  async function load() {
    try {
      const r = await fetch('/api/v1/org/notifications', { credentials: 'include' })
      if (r.ok) {
        const d = (await r.json()) as { items?: Notif[]; unread?: number }
        setItems(d.items ?? [])
        setUnread(d.unread ?? 0)
      }
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 30_000)
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => {
      clearInterval(id)
      document.removeEventListener('mousedown', onClick)
    }
  }, [])

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && unread > 0) {
      setUnread(0)
      await fetch('/api/v1/org/notifications/read', {
        method: 'POST',
        credentials: 'include',
      }).catch(() => {})
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
        className="relative flex h-9 w-9 items-center justify-center rounded-[10px] border border-line-strong bg-raised text-ink-soft transition hover:border-ink-faint hover:text-ink"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-[18px] w-[18px]"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 01-3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="surface absolute right-0 z-50 mt-2 w-72 overflow-hidden">
          <p className="border-b border-line px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
            Notifications
          </p>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-ink-faint">Nothing yet.</p>
            )}
            {items.map((n) => (
              <div
                key={n.id}
                className={cn(
                  'border-b border-line/60 px-3 py-2 text-sm last:border-0',
                  !n.readAt && 'bg-ink/[0.03]',
                )}
              >
                <p className="text-ink">{label(n)}</p>
                <p className="mt-0.5 text-[11px] text-ink-faint">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
