import { segments as segmentSvc, surveys as surveySvc } from '@chorala/core'
import { SurveyBuilder, SurveyRowActions } from '@/components/survey-controls'
import { Badge, Card } from '@/components/ui'
import { requireAuthContext } from '@/lib/session'

const TYPE_LABEL: Record<string, string> = {
  nps: 'NPS',
  csat: 'CSAT',
  ces: 'CES',
  rating: 'Rating',
  text: 'Open text',
  choice: 'Choice',
}

export default async function SurveysPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const ctx = await requireAuthContext()
  const [list, segments] = await Promise.all([
    surveySvc.listSurveys(ctx, projectId),
    segmentSvc.listSegments(ctx, projectId),
  ])
  const withResults = await Promise.all(
    list.map(async (s) => ({ s, r: await surveySvc.getResults(ctx, projectId, s.id) })),
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-[-0.02em]">Surveys</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Ask NPS, CSAT or a quick question right in your product — targeted at a segment, with
          results that feed the same feedback graph.
        </p>
      </div>

      <Card className="p-5">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
          New survey
        </p>
        <SurveyBuilder
          projectId={projectId}
          segments={segments.map((s) => ({ id: s.id, name: s.name }))}
        />
      </Card>

      {list.length === 0 ? (
        <Card className="p-8 text-center text-sm text-ink-faint">
          No surveys yet. Create one above — it’ll appear to your end-users on the portal.
        </Card>
      ) : (
        <div className="space-y-3">
          {withResults.map(({ s, r }) => {
            return (
              <Card key={s.id} className="p-5">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 grow">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium tracking-[-0.01em]">{s.name}</h3>
                      <Badge>{TYPE_LABEL[s.type] ?? s.type}</Badge>
                      {s.segmentId && <Badge className="bg-accent/10 text-accent">targeted</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">{s.question}</p>
                  </div>
                  <SurveyRowActions projectId={projectId} id={s.id} isActive={s.isActive} />
                </div>

                {/* results */}
                <div className="mt-4 flex flex-wrap items-center gap-5 border-t border-line pt-4 text-sm">
                  <Metric label="Responses" value={String(r.responseCount)} />
                  {r.nps !== null && <Metric label="NPS" value={String(r.nps)} accent />}
                  {r.csatPercent !== null && (
                    <Metric label="Top-box" value={`${r.csatPercent}%`} accent />
                  )}
                  {r.average !== null && <Metric label="Average" value={String(r.average)} />}
                </div>
                {Object.keys(r.distribution).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {Object.entries(r.distribution)
                      .sort((a, b) => Number(a[0]) - Number(b[0]))
                      .map(([v, n]) => (
                        <span
                          key={v}
                          className="rounded-md bg-ink/[0.05] px-2 py-1 text-xs tabular-nums text-ink-soft"
                        >
                          {v}: <strong className="text-ink">{n}</strong>
                        </span>
                      ))}
                  </div>
                )}
                {Object.keys(r.choices).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {Object.entries(r.choices).map(([opt, n]) => (
                      <span
                        key={opt}
                        className="rounded-md bg-ink/[0.05] px-2 py-1 text-xs text-ink-soft"
                      >
                        {opt}: <strong className="text-ink">{n}</strong>
                      </span>
                    ))}
                  </div>
                )}
                {r.texts.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {r.texts.slice(0, 5).map((t) => (
                      <li
                        key={t}
                        className="rounded-lg bg-paper/70 px-3 py-2 text-sm text-ink-soft"
                      >
                        “{t}”
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
        {label}
      </p>
      <p className={`font-display text-2xl tabular-nums ${accent ? 'text-accent' : ''}`}>{value}</p>
    </div>
  )
}
