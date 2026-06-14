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
  const brand = widget.primaryColor ?? '#6366f1'

  const tabs = [
    ['', 'Board'],
    ['roadmap', 'Roadmap'],
    ['changelog', 'Changelog'],
  ]

  return (
    <div style={{ ['--brand' as string]: brand }} className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-5 py-4">
          <h1 className="text-lg font-bold">{data.project.name}</h1>
          <nav className="ml-auto flex gap-1 text-sm">
            {tabs.map(([slug, label]) => (
              <Link
                key={label}
                href={`/portal/${projectId}/${slug}`}
                className="rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-100"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-6">{children}</main>
    </div>
  )
}
