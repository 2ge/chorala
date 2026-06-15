import { posts as postSvc } from '@chorala/core'
import { AskBox, IngestForm, ReviewActions } from '@/components/autopilot'
import { Badge, Card } from '@/components/ui'
import { requireAuthContext } from '@/lib/session'

export default async function AutopilotPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const ctx = await requireAuthContext()
  const pending = await postSvc.listPosts(ctx, projectId, { reviewStatus: 'pending', sort: 'new' })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-[-0.02em]">Autopilot</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Turn support conversations into feedback automatically, and ask questions across
          everything your users have told you.
        </p>
      </div>

      <Card className="p-5">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
          Capture from a conversation
        </p>
        <IngestForm projectId={projectId} />
      </Card>

      <Card className="p-5">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
          Ask your feedback
        </p>
        <AskBox projectId={projectId} />
      </Card>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-ink-faint">
            Review queue
          </h2>
          {pending.length > 0 && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-white">
              {pending.length}
            </span>
          )}
        </div>
        {pending.length === 0 ? (
          <Card className="p-8 text-center text-sm text-ink-faint">
            Nothing waiting. Captured feedback shows up here for a human to approve before it goes
            live.
          </Card>
        ) : (
          <div className="space-y-3">
            {pending.map((p) => {
              const src = p.source as { type?: string; author?: { email?: string } }
              return (
                <Card key={p.id} className="flex items-start gap-4 p-4">
                  <div className="min-w-0 grow">
                    <p className="font-medium tracking-[-0.01em]">{p.title}</p>
                    {p.body && <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{p.body}</p>}
                    <div className="mt-2 flex items-center gap-2 text-xs text-ink-faint">
                      {src.type && <Badge className="bg-accent/10 text-accent">{src.type}</Badge>}
                      {src.author?.email && <span>{src.author.email}</span>}
                    </div>
                  </div>
                  <ReviewActions projectId={projectId} postId={p.id} />
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
