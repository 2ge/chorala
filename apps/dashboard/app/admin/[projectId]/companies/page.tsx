import { companies as companySvc } from '@chorala/core'
import { Badge, Card } from '@/components/ui'
import { requireAuthContext } from '@/lib/session'

const money = (n: number) => `$${n.toLocaleString('en-US')}`

export default async function CompaniesPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const ctx = await requireAuthContext()
  const rows = await companySvc.listCompanies(ctx, projectId)
  const totalMrr = rows.reduce((s, c) => s + c.mrr, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-[-0.02em]">Companies</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Accounts behind your feedback. Synced from the identify token (or edit MRR via the API)
            to weight requests by revenue.
          </p>
        </div>
        <span className="rounded-full border border-line bg-raised px-3 py-1 text-sm font-semibold tabular-nums">
          {money(totalMrr)} MRR
        </span>
      </div>

      {rows.length === 0 ? (
        <Card className="p-10 text-center text-ink-faint">
          No companies yet. Pass a <code className="text-ink-soft">company</code> object in the
          end-user identify JWT (`{'{ id, name, mrr, plan }'}`) and they’ll appear here.
        </Card>
      ) : (
        <Card className="divide-y divide-line/70 overflow-hidden p-0">
          <div className="hidden grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint sm:grid">
            <span>Company</span>
            <span className="text-right">Users</span>
            <span className="text-right">Posts</span>
            <span className="text-right">MRR</span>
          </div>
          {rows.map((c) => (
            <div
              key={c.id}
              className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3.5 transition hover:bg-paper/60 sm:grid-cols-[1fr_auto_auto_auto]"
            >
              <div className="min-w-0">
                <p className="truncate font-medium tracking-[-0.01em]">{c.name}</p>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-faint">
                  {c.plan && <Badge>{c.plan}</Badge>}
                  {c.domain && <span className="truncate">{c.domain}</span>}
                </div>
              </div>
              <span className="hidden text-right text-sm tabular-nums text-ink-soft sm:block">
                {c.userCount}
              </span>
              <span className="hidden text-right text-sm tabular-nums text-ink-soft sm:block">
                {c.postCount}
              </span>
              <span className="text-right text-sm font-semibold tabular-nums">{money(c.mrr)}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
