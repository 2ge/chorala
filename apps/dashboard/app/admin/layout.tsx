import { projects as projectService } from '@chorala/core'
import { cookies } from 'next/headers'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { NotificationBell } from '@/components/notification-bell'
import { SignOut } from '@/components/sign-out'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { requireAuthContext } from '@/lib/session'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const ctx = await requireAuthContext()
  const projects = await projectService.listProjects(ctx)
  const theme = (await cookies()).get('chorala-theme')?.value ?? 'auto'

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-5 px-6">
          <Link href="/admin" className="group flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-accent font-display text-[17px] leading-none text-white shadow-[0_6px_14px_-6px_rgba(217,81,42,0.9)]">
              C
            </span>
            <span className="font-display text-[22px] leading-none tracking-[-0.02em]">
              Chorala
            </span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/admin/${p.id}/posts`}
                className="rounded-full px-3 py-1.5 text-sm text-ink-soft transition hover:bg-ink/5 hover:text-ink"
              >
                {p.name}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <a
              href="/docs"
              target="_blank"
              rel="noreferrer"
              className="hidden text-sm text-ink-soft transition hover:text-ink sm:inline"
            >
              API ↗
            </a>
            <span className="hidden rounded-full border border-line bg-raised px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft sm:inline">
              {ctx.role}
            </span>
            <NotificationBell />
            <ThemeSwitcher initial={theme} />
            <SignOut />
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}
