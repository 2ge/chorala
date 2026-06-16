import { analytics } from '@chorala/core'
import Link from 'next/link'
import { Badge, Card } from '@/components/ui'
import { requireAuthContext } from '@/lib/session'

const TIMEFRAMES: { v: string; label: string }[] = [
  { v: '7d', label: '7 days' },
  { v: '30d', label: '30 days' },
  { v: '90d', label: '90 days' },
  { v: 'all', label: 'All time' },
]

const money = (n: number) => `$${n.toLocaleString('en-US')}`

export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>
  searchParams: Promise<{ timeframe?: string }>
}) {
  const { projectId } = await params
  const { timeframe = '30d' } = await searchParams
  const tf = TIMEFRAMES.some((t) => t.v === timeframe) ? timeframe : '30d'
  const ctx = await requireAuthContext()
  const a = await analytics.getAnalytics(ctx, projectId, { timeframe: tf as '7d' })
  const base = `/admin/${projectId}/analytics`

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl tracking-[-0.02em]">Analytics</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Where demand is moving — votes, engagement, board health, and the revenue & evidence
            behind each request.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-line p-0.5">
            {TIMEFRAMES.map((t) => (
              <Link
                key={t.v}
                href={`${base}?timeframe=${t.v}`}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  tf === t.v ? 'bg-accent text-white' : 'text-ink-soft hover:text-ink'
                }`}
              >
                {t.label}
              </Link>
            ))}
          </div>
          <a
            href={`${base}/export?timeframe=${tf}`}
            className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:text-ink"
          >
            Export CSV
          </a>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Posts"
          total={a.summary.posts}
          now={a.summary.newPosts}
          prev={a.summary.prevPosts}
          tf={tf}
        />
        <Kpi
          label="Votes"
          total={a.summary.votes}
          now={a.summary.newVotes}
          prev={a.summary.prevVotes}
          tf={tf}
        />
        <Kpi
          label="Comments"
          total={a.summary.comments}
          now={a.summary.newComments}
          prev={a.summary.prevComments}
          tf={tf}
        />
        <Kpi label="Active voters" total={a.summary.voters} tf={tf} />
      </div>

      {/* Velocity */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="p-5">
          <CardTitle>Vote velocity</CardTitle>
          <Spark data={a.voteVelocity.map((v) => ({ date: v.date, n: v.votes }))} />
        </Card>
        <Card className="p-5">
          <CardTitle>New posts</CardTitle>
          <Spark data={a.postVelocity.map((v) => ({ date: v.date, n: v.posts }))} />
        </Card>
      </div>

      {/* Board health */}
      <Card className="p-5">
        <CardTitle>Board health</CardTitle>
        {a.boardHealth.length === 0 ? (
          <Empty>No boards yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.08em] text-ink-faint">
                  <th className="py-1.5 pr-3 font-semibold">Board</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Total</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Open</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Planned</th>
                  <th className="px-2 py-1.5 text-right font-semibold">In progress</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Shipped</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Votes</th>
                </tr>
              </thead>
              <tbody>
                {a.boardHealth.map((b) => (
                  <tr key={b.boardId} className="border-t border-line/60">
                    <td className="py-2 pr-3 font-medium">{b.name}</td>
                    <td className="px-2 text-right tabular-nums">{b.total}</td>
                    <td className="px-2 text-right tabular-nums text-ink-soft">{b.open}</td>
                    <td className="px-2 text-right tabular-nums text-ink-soft">{b.planned}</td>
                    <td className="px-2 text-right tabular-nums text-ink-soft">{b.inProgress}</td>
                    <td className="px-2 text-right tabular-nums text-emerald-600">{b.complete}</td>
                    <td className="px-2 text-right font-semibold tabular-nums">{b.votes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Sentiment */}
      <Card className="p-5">
        <CardTitle>Sentiment</CardTitle>
        <StatusBar
          dist={[
            { kind: 'positive', name: 'Positive', color: '#10b981', count: a.sentiment.positive },
            { kind: 'neutral', name: 'Neutral', color: '#94a3b8', count: a.sentiment.neutral },
            { kind: 'negative', name: 'Negative', color: '#ef4444', count: a.sentiment.negative },
          ]}
        />
      </Card>

      {/* Status distribution + tags */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="p-5">
          <CardTitle>Status distribution</CardTitle>
          <StatusBar dist={a.statusDistribution} />
        </Card>
        <Card className="p-5">
          <CardTitle>Top themes (tags)</CardTitle>
          {a.topTags.length === 0 ? (
            <Empty>No tags applied yet.</Empty>
          ) : (
            <div className="flex flex-wrap gap-2">
              {a.topTags.map((t) => (
                <span
                  key={t.name}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs"
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: t.color }} />
                  {t.name}
                  <strong className="tabular-nums text-ink">{t.count}</strong>
                </span>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Top lists */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card className="p-5">
          <CardTitle>Top by votes</CardTitle>
          <RankList
            items={a.topPosts.map(({ post }) => ({
              id: post.id,
              title: post.title,
              meta: `▲ ${post.voteCount}`,
            }))}
            projectId={projectId}
          />
        </Card>
        <Card className="p-5">
          <CardTitle>Top by revenue</CardTitle>
          <RankList
            items={a.topByRevenue.map((p) => ({
              id: p.id,
              title: p.title,
              meta: money(p.revenue),
            }))}
            projectId={projectId}
            empty="Identify users with companies + MRR to rank by revenue impact."
          />
        </Card>
        <Card className="p-5">
          <CardTitle>Most evidenced</CardTitle>
          <RankList
            items={a.mostEvidenced.map((p) => ({
              id: p.id,
              title: p.title,
              meta: `${p.insightCount} ${p.insightCount === 1 ? 'quote' : 'quotes'}`,
            }))}
            projectId={projectId}
            empty="Link customer quotes to posts to see which requests have the most evidence."
          />
        </Card>
      </div>

      {a.clusterThemes.length > 0 && (
        <Card className="p-5">
          <CardTitle>AI cluster themes</CardTitle>
          <ul className="space-y-1.5 text-sm">
            {a.clusterThemes.map((c) => (
              <li key={c.label}>
                <span className="font-medium">{c.label}</span>{' '}
                <span className="text-ink-soft">— {c.summary}</span> <Badge>{c.count}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function delta(now: number, prev: number) {
  if (prev === 0) return now === 0 ? null : { up: true, label: 'new' }
  const pct = Math.round(((now - prev) / prev) * 100)
  return { up: pct >= 0, label: `${pct >= 0 ? '+' : ''}${pct}%` }
}

function Kpi({
  label,
  total,
  now,
  prev,
  tf,
}: {
  label: string
  total: number
  now?: number
  prev?: number
  tf: string
}) {
  const d = now !== undefined && prev !== undefined && tf !== 'all' ? delta(now, prev) : null
  return (
    <Card className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
        {label}
      </p>
      <p className="mt-1 font-display text-3xl tabular-nums tracking-[-0.02em]">
        {total.toLocaleString()}
      </p>
      {d && (
        <p className={`mt-0.5 text-xs font-medium ${d.up ? 'text-emerald-600' : 'text-red-500'}`}>
          {d.up ? '▲' : '▼'} {d.label} <span className="font-normal text-ink-faint">vs prev</span>
        </p>
      )}
    </Card>
  )
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
      {children}
    </p>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-ink-faint">{children}</p>
}

function Spark({ data }: { data: { date: string; n: number }[] }) {
  if (data.length === 0) return <Empty>No activity in this window.</Empty>
  const max = Math.max(1, ...data.map((d) => d.n))
  return (
    <div className="flex h-28 items-end gap-0.5">
      {data.map((d) => (
        <div
          key={d.date}
          className="grow rounded-t bg-accent/70 transition hover:bg-accent"
          style={{ height: `${Math.max(3, (d.n / max) * 100)}%` }}
          title={`${d.date}: ${d.n}`}
        />
      ))}
    </div>
  )
}

function StatusBar({
  dist,
}: {
  dist: { kind: string; name: string; color: string; count: number }[]
}) {
  const total = dist.reduce((s, d) => s + d.count, 0)
  if (total === 0) return <Empty>No posts yet.</Empty>
  return (
    <div className="space-y-3">
      <div className="flex h-3 overflow-hidden rounded-full">
        {dist
          .filter((d) => d.count > 0)
          .map((d) => (
            <div
              key={d.kind}
              style={{ width: `${(d.count / total) * 100}%`, background: d.color }}
              title={`${d.name}: ${d.count}`}
            />
          ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
        {dist.map((d) => (
          <span key={d.kind} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
            {d.name} <strong className="tabular-nums text-ink">{d.count}</strong>
          </span>
        ))}
      </div>
    </div>
  )
}

function RankList({
  items,
  projectId,
  empty,
}: {
  items: { id: string; title: string; meta: string }[]
  projectId: string
  empty?: string
}) {
  if (items.length === 0) return <Empty>{empty ?? 'Nothing yet.'}</Empty>
  return (
    <ol className="space-y-2">
      {items.map((it, i) => (
        <li key={it.id} className="flex items-center gap-2.5 text-sm">
          <span className="w-4 shrink-0 text-ink-faint tabular-nums">{i + 1}</span>
          <Link
            href={`/admin/${projectId}/posts/${it.id}`}
            className="grow truncate transition hover:text-accent"
          >
            {it.title}
          </Link>
          <span className="shrink-0 font-semibold tabular-nums">{it.meta}</span>
        </li>
      ))}
    </ol>
  )
}
