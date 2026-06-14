import { boards as boardSvc, posts as postSvc, statuses as statusSvc } from '@heed/core'
import Link from 'next/link'
import { PinButton, StatusSelect } from '@/components/post-controls'
import { Badge, Button, Card, Input, Label, Select, VotePill } from '@/components/ui'
import { adminCreatePost } from '@/lib/actions'
import { requireAuthContext } from '@/lib/session'

export default async function PostsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const ctx = await requireAuthContext()
  const [posts, statuses, boards] = await Promise.all([
    postSvc.listPosts(ctx, projectId, {}),
    statusSvc.listStatuses(ctx, projectId),
    boardSvc.listBoards(ctx, projectId),
  ])
  const statusById = new Map(statuses.map((s) => [s.id, s]))

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-[-0.02em]">Posts</h1>
          <p className="mt-1 text-sm text-ink-soft">Triage what your users are asking for.</p>
        </div>
        <span className="rounded-full border border-line bg-raised px-3 py-1 text-sm font-semibold tabular-nums">
          {posts.length} ideas
        </span>
      </div>

      <Card className="p-4">
        <form action={adminCreatePost} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="projectId" value={projectId} />
          <div className="grow">
            <Label>New post</Label>
            <Input name="title" placeholder="Title of a new idea…" required minLength={2} />
          </div>
          <div>
            <Label>Board</Label>
            <Select name="boardId" defaultValue={boards[0]?.id}>
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit">Add idea</Button>
        </form>
      </Card>

      <Card className="divide-y divide-line/70 overflow-hidden p-0">
        {posts.length === 0 && (
          <p className="p-10 text-center text-ink-faint">
            No posts yet — add your first idea above.
          </p>
        )}
        {posts.map((p) => {
          const status = p.statusId ? statusById.get(p.statusId) : null
          return (
            <div
              key={p.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3.5 transition hover:bg-paper/60"
            >
              <VotePill count={p.voteCount} size="sm" />
              <div className="min-w-0 grow">
                <Link
                  href={`/admin/${projectId}/posts/${p.id}`}
                  className="font-medium tracking-[-0.01em] transition hover:text-accent"
                >
                  {p.title}
                </Link>
                <div className="mt-1 flex items-center gap-2.5 text-xs text-ink-faint">
                  {status && <Badge color={status.color}>{status.name}</Badge>}
                  <span className="inline-flex items-center gap-1">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      aria-hidden
                    >
                      <title>comments</title>
                      <path d="M21 11.5a8.4 8.4 0 01-9 8 9 9 0 01-4-1L3 20l1.5-4.5A8.4 8.4 0 1121 11.5z" />
                    </svg>
                    {p.commentCount}
                  </span>
                </div>
              </div>
              <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                <PinButton projectId={projectId} postId={p.id} pinned={p.isPinned} />
                <div className="w-36 sm:w-44">
                  <StatusSelect
                    projectId={projectId}
                    postId={p.id}
                    statusId={p.statusId}
                    statuses={statuses}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </Card>
    </div>
  )
}
