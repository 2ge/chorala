import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { getPortalProject } from '@/lib/portal'

export default async function PortalLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const data = await getPortalProject(projectId)
  if (!data) notFound()
  const widget = data.project.widgetSettings as { primaryColor?: string }
  const brand = widget.primaryColor ?? '#d9512a'

  const tabs = [
    ['', 'Board'],
    ['roadmap', 'Roadmap'],
    ['changelog', 'Changelog'],
  ]

  return (
    <div style={{ ['--brand' as string]: brand }} className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-5 py-5">
          <h1 className="font-display text-2xl tracking-[-0.02em]">{data.project.name}</h1>
          <nav className="ml-auto flex gap-1 text-sm">
            {tabs.map(([slug, label]) => (
              <Link
                key={label}
                href={`/portal/${projectId}/${slug}`}
                className="rounded-full px-3 py-1.5 font-medium text-ink-soft transition hover:bg-ink/5 hover:text-ink"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-8 rise">{children}</main>
      <footer className="mx-auto max-w-3xl px-5 pb-10 pt-4 text-xs text-ink-faint">
        Powered by <span className="font-display text-sm text-ink-soft">Heed</span>
      </footer>
    </div>
  )
}
