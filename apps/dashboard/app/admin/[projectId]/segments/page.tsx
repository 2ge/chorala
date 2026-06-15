import { segments as segmentSvc } from '@chorala/core'
import { DeleteSegmentButton, SegmentBuilder } from '@/components/segment-builder'
import { Badge, Card } from '@/components/ui'
import { requireAuthContext } from '@/lib/session'

const FIELD_LABEL: Record<string, string> = {
  plan: 'plan',
  mrr: 'MRR',
  locale: 'locale',
  email_domain: 'email domain',
  has_company: 'has company',
}
const OP_LABEL: Record<string, string> = {
  eq: '=',
  neq: '≠',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
}

export default async function SegmentsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const ctx = await requireAuthContext()
  const rows = await segmentSvc.listSegments(ctx, projectId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-[-0.02em]">Segments</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Saved audiences over your end-users and their companies. Target changelog announcements at
          exactly the people they’re for.
        </p>
      </div>

      <Card className="p-5">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
          New segment
        </p>
        <SegmentBuilder projectId={projectId} />
      </Card>

      {rows.length > 0 && (
        <Card className="divide-y divide-line/70 overflow-hidden p-0">
          {rows.map((s) => {
            const def = s.definition as {
              match?: string
              rules?: { field: string; op: string; value: string }[]
            }
            return (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="min-w-0 grow">
                  <p className="font-medium tracking-[-0.01em]">{s.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-faint">
                    {(def.rules ?? []).map((r, i) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: static rendered rule list
                      <Badge key={i}>
                        {FIELD_LABEL[r.field] ?? r.field} {OP_LABEL[r.op] ?? r.op} {r.value}
                      </Badge>
                    ))}
                    {(def.rules ?? []).length === 0 && <span>everyone</span>}
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-0.5 text-sm font-semibold tabular-nums text-accent">
                  {s.matchCount}
                </span>
                <DeleteSegmentButton projectId={projectId} id={s.id} />
              </div>
            )
          })}
        </Card>
      )}
    </div>
  )
}
