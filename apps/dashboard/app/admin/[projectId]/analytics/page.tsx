import { analytics } from '@heed/core'
import { Card } from '@/components/ui'
import { requireAuthContext } from '@/lib/session'

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const ctx = await requireAuthContext()
  const data = await analytics.getAnalytics(ctx, projectId, { timeframe: '30d' })
  const maxVotes = Math.max(1, ...data.voteVelocity.map((v) => v.votes))

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Analytics</h1>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-500">Top requests</h2>
          <ol className="space-y-2">
            {data.topPosts.slice(0, 8).map(({ post }, i) => (
              <li key={post.id} className="flex items-center gap-3 text-sm">
                <span className="w-5 text-slate-400">{i + 1}</span>
                <span className="grow truncate">{post.title}</span>
                <span className="font-semibold">▲ {post.voteCount}</span>
              </li>
            ))}
          </ol>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-500">Vote velocity (30d)</h2>
          {data.voteVelocity.length === 0 ? (
            <p className="text-sm text-slate-400">No votes in this window.</p>
          ) : (
            <div className="flex h-32 items-end gap-1">
              {data.voteVelocity.map((v) => (
                <div key={v.date} className="grow" title={`${v.date}: ${v.votes}`}>
                  <div
                    className="rounded-t bg-brand-500"
                    style={{ height: `${(v.votes / maxVotes) * 100}%` }}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-500">AI cluster themes</h2>
        {data.clusterThemes.length === 0 ? (
          <p className="text-sm text-slate-400">
            No clusters yet — run the AI worker (Phase 6) to generate themes.
          </p>
        ) : (
          <ul className="space-y-2">
            {data.clusterThemes.map((c) => (
              <li key={c.label} className="text-sm">
                <span className="font-semibold">{c.label}</span> — {c.summary} ({c.count})
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
