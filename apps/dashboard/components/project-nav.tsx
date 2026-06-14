'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

const I = (d: string) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-[18px] w-[18px]"
    aria-hidden
  >
    <title>icon</title>
    <path d={d} />
  </svg>
)

const ICONS: Record<string, ReactNode> = {
  posts: I('M8 9h8M8 13h5M4 5h16v12H9l-4 3z'),
  roadmap: I('M4 6h6M4 12h10M4 18h7M17 4l3 3-3 3M14 7h6'),
  changelog: I('M6 3h9l5 5v13H6zM14 3v6h6M9 13h6M9 17h4'),
  analytics: I('M4 20V10M10 20V4M16 20v-6M22 20H2'),
  settings: I(
    'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1l2-1.6-2-3.4-2.3 1a7 7 0 00-1.7-1L16 2H8l-.9 3a7 7 0 00-1.7 1l-2.3-1-2 3.4L3 11a7 7 0 000 2l-2 1.6 2 3.4 2.3-1a7 7 0 001.7 1L8 22h8l.9-3a7 7 0 001.7-1l2.3 1 2-3.4-2-1.6c.1-.3.1-.7.1-1z',
  ),
  members: I(
    'M16 19v-1a4 4 0 00-4-4H6a4 4 0 00-4 4v1M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM22 19v-1a4 4 0 00-3-3.9M16 4.1a4 4 0 010 7.8',
  ),
  keys: I('M15 7a4 4 0 11-3.5 6L4 21H2v-2l8-8a4 4 0 015-4zM15.5 7.5h.01'),
}

export function ProjectNav({
  projectId,
  tabs,
  horizontal,
}: {
  projectId: string
  tabs: [string, string][]
  horizontal?: boolean
}) {
  const pathname = usePathname()
  return (
    <nav
      className={
        horizontal
          ? 'flex gap-1 overflow-x-auto pb-px [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          : 'space-y-0.5'
      }
    >
      {tabs.map(([slug, label]) => {
        const href = `/admin/${projectId}/${slug}`
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={slug}
            href={href}
            className={cn(
              'group flex shrink-0 items-center gap-2 rounded-[10px] text-sm font-medium transition',
              horizontal ? 'px-3 py-1.5' : 'px-3 py-2 gap-2.5',
              active
                ? horizontal
                  ? 'bg-accent text-white'
                  : 'bg-accent-soft text-accent shadow-[inset_2px_0_0_var(--color-accent)]'
                : 'text-ink-soft hover:bg-ink/[0.04] hover:text-ink',
            )}
          >
            <span
              className={
                active
                  ? horizontal
                    ? 'text-white'
                    : 'text-accent'
                  : 'text-ink-faint group-hover:text-ink-soft'
              }
            >
              {ICONS[slug]}
            </span>
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
