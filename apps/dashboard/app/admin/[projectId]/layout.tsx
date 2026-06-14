import { projects as projectService } from '@heed/core'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { requireAuthContext } from '@/lib/session'

const TABS = [
  ['posts', 'Posts'],
  ['roadmap', 'Roadmap'],
  ['changelog', 'Changelog'],
  ['analytics', 'Analytics'],
  ['settings', 'Settings'],
  ['members', 'Members'],
  ['keys', 'API Keys'],
] as const

export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const ctx = await requireAuthContext()
  const project = await projectService.getProject(ctx, projectId)

  return (
    <div className="mx-auto flex max-w-6xl gap-6 px-5 py-6">
      <aside className="w-44 shrink-0">
        <p className="mb-3 px-2 text-sm font-bold">{project.name}</p>
        <nav className="space-y-0.5">
          {TABS.map(([slug, label]) => (
            <Link
              key={slug}
              href={`/admin/${projectId}/${slug}`}
              className="block rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              {label}
            </Link>
          ))}
        </nav>
        <a
          href={`/portal/${projectId}`}
          target="_blank"
          rel="noreferrer"
          className="mt-4 block px-3 text-xs text-brand-600 hover:underline"
        >
          View public portal →
        </a>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}
