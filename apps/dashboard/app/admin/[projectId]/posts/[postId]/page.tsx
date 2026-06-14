import {
  comments as commentSvc,
  integrations,
  posts as postSvc,
  statuses as statusSvc,
  tags as tagSvc,
} from '@chorala/core'
import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  CommentForm,
  DedupSuggestions,
  MergeControl,
  TagEditor,
} from '@/components/detail-controls'
import { GithubIssueButton } from '@/components/github-button'
import { PinButton, StatusSelect } from '@/components/post-controls'
import { Badge, Card, VotePill } from '@/components/ui'
import { requireAuthContext } from '@/lib/session'

const SectionLabel = ({ children }: { children: ReactNode }) => (
  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
    {children}
  </p>
)

export default async function PostDetail({
  params,
}: {
  params: Promise<{ projectId: string; postId: string }>
}) {
  const { projectId, postId } = await params
  const ctx = await requireAuthContext()
  const [post, statuses, allTags, postTags, thread, allPosts, dedupSuggestions, ints, issue] =
    await Promise.all([
      postSvc.getPost(ctx, projectId, postId),
      statusSvc.listStatuses(ctx, projectId),
      tagSvc.listTags(ctx, projectId),
      tagSvc.listPostTags(ctx, projectId, postId),
      commentSvc.listComments(projectId, postId, { includeInternal: true }),
      postSvc.listPosts(ctx, projectId, {}),
      postSvc.getDedupSuggestions(ctx, projectId, postId),
      integrations.listIntegrations(ctx, projectId),
      integrations.getPostIssue(ctx, projectId, postId),
    ])
  const githubConnected = ints.some((i) => i.type === 'github')
  const candidates = allPosts
    .filter((p) => p.id !== postId)
    .map((p) => ({ id: p.id, title: p.title }))

  return (
    <div className="space-y-5">
      <Link
        href={`/admin/${projectId}/posts`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-accent"
      >
        <span aria-hidden>←</span> Back to posts
      </Link>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-start gap-5">
              <VotePill count={post.voteCount} size="lg" />
              <div className="min-w-0 pt-1">
                <h1 className="font-display text-2xl leading-tight tracking-[-0.02em]">
                  {post.title}
                </h1>
                <p className="mt-2.5 whitespace-pre-wrap leading-relaxed text-ink-soft">
                  {post.body || '—'}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <SectionLabel>Discussion</SectionLabel>
            <div className="mb-4 space-y-3">
              {thread.length === 0 && (
                <p className="text-sm text-ink-faint">No comments yet — start the conversation.</p>
              )}
              {thread.map((c) => (
                <div
                  key={c.id}
                  className={
                    c.isInternal
                      ? 'rounded-xl border border-amber-200/70 bg-amber-50 p-3.5 text-sm'
                      : 'rounded-xl bg-paper/70 p-3.5 text-sm'
                  }
                >
                  {c.isInternal && (
                    <Badge className="mb-1.5 border-amber-300/60 bg-amber-100 text-amber-700">
                      Internal
                    </Badge>
                  )}
                  <p className="whitespace-pre-wrap leading-relaxed">{c.body}</p>
                </div>
              ))}
            </div>
            <CommentForm projectId={projectId} postId={postId} />
          </Card>
        </div>

        <div className="space-y-4">
          <DedupSuggestions projectId={projectId} postId={postId} suggestions={dedupSuggestions} />
          <Card className="space-y-4 p-5">
            <div>
              <SectionLabel>Status</SectionLabel>
              <StatusSelect
                projectId={projectId}
                postId={postId}
                statusId={post.statusId}
                statuses={statuses}
              />
            </div>
            <div>
              <SectionLabel>Pin to top</SectionLabel>
              <PinButton projectId={projectId} postId={postId} pinned={post.isPinned} />
            </div>
          </Card>

          <Card className="p-5">
            <SectionLabel>Tags</SectionLabel>
            <TagEditor
              projectId={projectId}
              postId={postId}
              allTags={allTags}
              current={postTags.map((t) => t.id)}
            />
          </Card>

          <Card className="p-5">
            <SectionLabel>Merge duplicate</SectionLabel>
            <MergeControl projectId={projectId} postId={postId} candidates={candidates} />
          </Card>

          <Card className="space-y-2 p-5">
            <SectionLabel>GitHub</SectionLabel>
            <GithubIssueButton
              projectId={projectId}
              postId={postId}
              connected={githubConnected}
              issue={issue}
            />
          </Card>
        </div>
      </div>
    </div>
  )
}
