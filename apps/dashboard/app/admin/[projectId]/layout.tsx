import { projects as projectService } from '@chorala/core'
import type { ReactNode } from 'react'
import { ProjectNav } from '@/components/project-nav'
import { requireAuthContext } from '@/lib/session'

const TABS: [string, string][] = [
  ['posts', 'Posts'],
  ['autopilot', 'Autopilot'],
  ['roadmap', 'Roadmap'],
  ['changelog', 'Changelog'],
  ['companies', 'Companies'],
  ['segments', 'Segments'],
  ['analytics', 'Analytics'],
  ['settings', 'Settings'],
  ['members', 'Members'],
  ['keys', 'API Keys'],
]

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
    <>
      {/* Mobile: horizontal nav under the header */}
      <div className="sticky top-16 z-20 border-b border-line/80 bg-paper/85 px-4 py-2 backdrop-blur-md lg:hidden">
        <ProjectNav projectId={projectId} tabs={TABS} horizontal />
      </div>

      <div className="mx-auto flex max-w-6xl gap-8 px-4 py-6 sm:px-6 sm:py-8">
        <aside className="sticky top-24 hidden h-fit w-52 shrink-0 lg:block">
          <p className="mb-4 px-3 font-display text-lg leading-tight">{project.name}</p>
          <ProjectNav projectId={projectId} tabs={TABS} />
          <a
            href={`/portal/${projectId}`}
            target="_blank"
            rel="noreferrer"
            className="mt-5 flex items-center gap-1.5 px-3 text-xs font-medium text-accent transition hover:gap-2.5"
          >
            View public portal
            <span aria-hidden>→</span>
          </a>
        </aside>
        <main className="min-w-0 flex-1 rise">{children}</main>
      </div>
    </>
  )
}
