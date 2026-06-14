import { publicFeed } from '@heed/core'
import { notFound } from 'next/navigation'
import { getPortalProject } from '@/lib/portal'

export default async function PortalRoadmap({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>
  searchParams: Promise<{ locale?: string }>
}) {
  const { projectId } = await params
  const { locale } = await searchParams
  const data = await getPortalProject(projectId)
  if (!data) notFound()
  const { columns } = await publicFeed.getRoadmap(projectId, { locale })

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {columns.map((col) => (
        <div key={col.status.id}>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: col.status.color }} />
            <span className="font-semibold">{col.status.name}</span>
          </div>
          <div className="space-y-2">
            {col.posts.map((p) => (
              <div key={p.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <p className="font-medium">{p.title}</p>
                <p className="mt-1 text-xs text-slate-400">▲ {p.voteCount}</p>
              </div>
            ))}
            {col.posts.length === 0 && <p className="text-xs text-slate-400">Nothing here yet.</p>}
          </div>
        </div>
      ))}
    </div>
  )
}
