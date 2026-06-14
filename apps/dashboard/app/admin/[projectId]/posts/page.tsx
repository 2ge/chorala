import { boards as boardSvc, posts as postSvc, statuses as statusSvc } from '@heed/core'
import Link from 'next/link'
import { PinButton, StatusSelect } from '@/components/post-controls'
import { Badge, Button, Card, Input, Label, Select } from '@/components/ui'
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Posts</h1>
        <span className="text-sm text-slate-500">{posts.length} ideas</span>
      </div>

      <Card className="p-4">
        <form action={adminCreatePost} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="projectId" value={projectId} />
          <div className="grow">
            <Label>New post</Label>
            <Input name="title" placeholder="Title of a new idea" required minLength={2} />
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
          <Button type="submit">Add</Button>
        </form>
      </Card>

      <Card className="divide-y divide-slate-100">
        {posts.length === 0 && <p className="p-6 text-center text-slate-400">No posts yet.</p>}
        {posts.map((p) => {
          const status = p.statusId ? statusById.get(p.statusId) : null
          return (
            <div key={p.id} className="flex items-center gap-4 p-3">
              <div className="flex w-12 shrink-0 flex-col items-center rounded-lg border border-slate-200 py-1">
                <span className="text-xs text-slate-400">▲</span>
                <span className="font-bold">{p.voteCount}</span>
              </div>
              <div className="min-w-0 grow">
                <Link
                  href={`/admin/${projectId}/posts/${p.id}`}
                  className="font-medium hover:text-brand-600"
                >
                  {p.title}
                </Link>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  {status && <Badge color={status.color}>{status.name}</Badge>}
                  <span>{p.commentCount} comments</span>
                </div>
              </div>
              <PinButton projectId={projectId} postId={p.id} pinned={p.isPinned} />
              <StatusSelect
                projectId={projectId}
                postId={p.id}
                statusId={p.statusId}
                statuses={statuses}
              />
            </div>
          )
        })}
      </Card>
    </div>
  )
}
