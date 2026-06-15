import { moderation } from '@chorala/core'
import { ModerationActions } from '@/components/moderation-controls'
import { Badge, Card } from '@/components/ui'
import { requireAuthContext } from '@/lib/session'

export default async function ModerationPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const ctx = await requireAuthContext()
  const { posts, comments } = await moderation.listModerationQueue(ctx, projectId)
  const total = posts.length + comments.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-[-0.02em]">Moderation</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Spam-flagged and hidden content lands here. Flagged items stay live until you act —
          <strong> Approve</strong> clears the flag, <strong>Hide</strong> removes it from the
          public board. Nothing is auto-deleted.
        </p>
      </div>

      {total === 0 ? (
        <Card className="p-8 text-center text-sm text-ink-faint">
          Nothing to review. New posts and comments are checked for spam automatically — anything
          suspicious shows up here.
        </Card>
      ) : (
        <div className="space-y-6">
          {posts.length > 0 && (
            <Section title="Posts" count={posts.length}>
              {posts.map((p) => (
                <Card key={p.id} className="flex items-start gap-4 p-4">
                  <div className="min-w-0 grow">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium tracking-[-0.01em]">{p.title}</p>
                      <FlagBadges flaggedReason={p.flaggedReason} hiddenAt={p.hiddenAt} />
                    </div>
                    {p.body && <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{p.body}</p>}
                    {p.authorEmail && (
                      <p className="mt-1 text-xs text-ink-faint">{p.authorEmail}</p>
                    )}
                  </div>
                  <ModerationActions
                    projectId={projectId}
                    kind="post"
                    id={p.id}
                    hidden={p.hiddenAt != null}
                  />
                </Card>
              ))}
            </Section>
          )}

          {comments.length > 0 && (
            <Section title="Comments" count={comments.length}>
              {comments.map((cm) => (
                <Card key={cm.id} className="flex items-start gap-4 p-4">
                  <div className="min-w-0 grow">
                    <div className="flex flex-wrap items-center gap-2">
                      <FlagBadges flaggedReason={cm.flaggedReason} hiddenAt={cm.hiddenAt} />
                    </div>
                    <p className="mt-1 line-clamp-3 text-sm text-ink-soft">“{cm.body}”</p>
                    {cm.authorEmail && (
                      <p className="mt-1 text-xs text-ink-faint">{cm.authorEmail}</p>
                    )}
                  </div>
                  <ModerationActions
                    projectId={projectId}
                    kind="comment"
                    id={cm.id}
                    hidden={cm.hiddenAt != null}
                  />
                </Card>
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  )
}

function Section({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-ink-faint">
          {title}
        </h2>
        <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[11px] font-bold text-ink-soft">
          {count}
        </span>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function FlagBadges({
  flaggedReason,
  hiddenAt,
}: {
  flaggedReason: string | null
  hiddenAt: Date | null
}) {
  return (
    <>
      {hiddenAt && <Badge className="bg-red-500/10 text-red-600">Hidden</Badge>}
      {flaggedReason && <Badge className="bg-amber-500/10 text-amber-600">{flaggedReason}</Badge>}
    </>
  )
}
