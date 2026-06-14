import Link from 'next/link'
import type { ReactNode } from 'react'

/** Shared centered card used by login / register / forgot / reset, matching the login page. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 bottom-0 select-none font-display text-[34vw] leading-none text-ink/[0.035]"
      >
        Chorala
      </span>
      <div className="relative w-full max-w-sm rise">
        <div className="mb-7 text-center">
          <Link
            href="/"
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent font-display text-2xl text-white shadow-[0_12px_28px_-10px_rgba(217,81,42,0.9)]"
          >
            C
          </Link>
          <h1 className="font-display text-[26px] tracking-[-0.02em]">{title}</h1>
          <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>
        </div>
        {children}
        {footer}
      </div>
    </main>
  )
}
