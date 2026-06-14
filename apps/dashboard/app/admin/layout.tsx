import { projects as projectService } from '@heed/core'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { SignOut } from '@/components/sign-out'
import { requireAuthContext } from '@/lib/session'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const ctx = await requireAuthContext()
  const projects = await projectService.listProjects(ctx)

  return (
    <div className="min-h-screen">
      <header className="flex h-14 items-center gap-4 border-b border-slate-200 bg-white px-5">
        <Link href="/admin" className="flex items-center gap-2 font-bold">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-sm text-white">
            H
          </span>
          Heed
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/admin/${p.id}/posts`}
              className="rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-100"
            >
              {p.name}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 text-sm text-slate-500">
          <span>{ctx.role}</span>
          <SignOut />
        </div>
      </header>
      {children}
    </div>
  )
}
