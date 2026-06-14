import { publicFeed } from '@heed/core'
import { Badge, Card } from '@/components/ui'
import { requireAuthContext } from '@/lib/session'

export default async function RoadmapPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  await requireAuthContext()
  const { columns } = await publicFeed.getRoadmap(projectId)

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Roadmap</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {columns.length === 0 && (
          <p className="text-slate-400">No statuses are marked “show on roadmap”.</p>
        )}
        {columns.map((col) => (
          <Card key={col.status.id} className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: col.status.color }} />
              <span className="font-semibold">{col.status.name}</span>
              <span className="text-xs text-slate-400">{col.posts.length}</span>
            </div>
            <div className="space-y-2">
              {col.posts.map((p) => (
                <div key={p.id} className="rounded-lg border border-slate-100 p-2 text-sm">
                  <span className="font-medium">{p.title}</span>
                  <Badge className="ml-2 bg-slate-100 text-slate-500">▲ {p.voteCount}</Badge>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
