import { publicFeed } from '@chorala/core'
import { requireAuthContext } from '@/lib/session'

export default async function RoadmapPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  await requireAuthContext()
  const { columns } = await publicFeed.getRoadmap(projectId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-[-0.02em]">Roadmap</h1>
        <p className="mt-1 text-sm text-ink-soft">What’s planned, in progress, and shipped.</p>
      </div>
      {columns.length === 0 ? (
        <p className="text-ink-faint">No statuses are marked “show on roadmap” yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {columns.map((col) => (
            <div key={col.status.id} className="rounded-2xl border border-line bg-paper/40 p-3">
              <div className="mb-3 flex items-center gap-2 px-1">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: col.status.color }}
                />
                <span className="font-semibold tracking-[-0.01em]">{col.status.name}</span>
                <span className="ml-auto rounded-full bg-ink/5 px-2 py-0.5 text-xs font-semibold tabular-nums text-ink-soft">
                  {col.posts.length}
                </span>
              </div>
              <div className="space-y-2">
                {col.posts.length === 0 && (
                  <p className="px-1 py-3 text-xs text-ink-faint">Nothing here yet.</p>
                )}
                {col.posts.map((p) => (
                  <div
                    key={p.id}
                    className="surface flex items-center gap-3 p-3 transition hover:-translate-y-0.5"
                  >
                    <span className="font-medium tracking-[-0.01em]">{p.title}</span>
                    <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-raised px-2 py-0.5 text-xs font-bold tabular-nums text-accent">
                      <span className="text-[0.7em]">▲</span>
                      {p.voteCount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
