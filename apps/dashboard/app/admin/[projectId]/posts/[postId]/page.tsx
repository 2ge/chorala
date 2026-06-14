import {
  comments as commentSvc,
  posts as postSvc,
  statuses as statusSvc,
  tags as tagSvc,
} from '@heed/core'
import Link from 'next/link'
import {
  CommentForm,
  DedupSuggestions,
  MergeControl,
  TagEditor,
} from '@/components/detail-controls'
import { PinButton, StatusSelect } from '@/components/post-controls'
import { Badge, Card } from '@/components/ui'
import { requireAuthContext } from '@/lib/session'

export default async function PostDetail({
  params,
}: {
  params: Promise<{ projectId: string; postId: string }>
}) {
  const { projectId, postId } = await params
  const ctx = await requireAuthContext()
  const [post, statuses, allTags, postTags, thread, allPosts, dedupSuggestions] = await Promise.all(
    [
      postSvc.getPost(ctx, projectId, postId),
      statusSvc.listStatuses(ctx, projectId),
      tagSvc.listTags(ctx, projectId),
      tagSvc.listPostTags(ctx, projectId, postId),
      commentSvc.listComments(projectId, postId, { includeInternal: true }),
      postSvc.listPosts(ctx, projectId, {}),
      postSvc.getDedupSuggestions(ctx, projectId, postId),
    ],
  )
  const candidates = allPosts
    .filter((p) => p.id !== postId)
    .map((p) => ({ id: p.id, title: p.title }))

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Link href={`/admin/${projectId}/posts`} className="text-sm text-brand-600 hover:underline">
          ← Back to posts
        </Link>
        <Card className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex w-14 shrink-0 flex-col items-center rounded-lg border border-slate-200 py-2">
              <span className="text-xs text-slate-400">▲</span>
              <span className="text-lg font-bold">{post.voteCount}</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold">{post.title}</h1>
              <p className="mt-2 whitespace-pre-wrap text-slate-600">{post.body || '—'}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-500">Discussion</h2>
          <div className="mb-4 space-y-3">
            {thread.length === 0 && <p className="text-sm text-slate-400">No comments yet.</p>}
            {thread.map((c) => (
              <div
                key={c.id}
                className={`rounded-lg p-3 text-sm ${c.isInternal ? 'border border-amber-200 bg-amber-50' : 'bg-slate-50'}`}
              >
                {c.isInternal && (
                  <Badge className="mb-1 bg-amber-100 text-amber-700">Internal</Badge>
                )}
                <p className="whitespace-pre-wrap">{c.body}</p>
              </div>
            ))}
          </div>
          <CommentForm projectId={projectId} postId={postId} />
        </Card>
      </div>

      <div className="space-y-5">
        <DedupSuggestions projectId={projectId} postId={postId} suggestions={dedupSuggestions} />
        <Card className="space-y-3 p-5">
          <div>
            <p className="mb-1 text-xs font-semibold text-slate-500">Status</p>
            <StatusSelect
              projectId={projectId}
              postId={postId}
              statusId={post.statusId}
              statuses={statuses}
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold text-slate-500">Pin</p>
            <PinButton projectId={projectId} postId={postId} pinned={post.isPinned} />
          </div>
        </Card>

        <Card className="space-y-2 p-5">
          <p className="text-xs font-semibold text-slate-500">Tags</p>
          <TagEditor
            projectId={projectId}
            postId={postId}
            allTags={allTags}
            current={postTags.map((t) => t.id)}
          />
        </Card>

        <Card className="space-y-2 p-5">
          <p className="text-xs font-semibold text-slate-500">Merge duplicate</p>
          <MergeControl projectId={projectId} postId={postId} candidates={candidates} />
        </Card>
      </div>
    </div>
  )
}
