import {
  comments as commentSvc,
  integrations,
  posts as postSvc,
  statuses as statusSvc,
  storage as storageSvc,
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
  const [
    post,
    statuses,
    allTags,
    postTags,
    thread,
    allPosts,
    dedupSuggestions,
    ints,
    issue,
    context,
    attachments,
  ] = await Promise.all([
    postSvc.getPost(ctx, projectId, postId),
    statusSvc.listStatuses(ctx, projectId),
    tagSvc.listTags(ctx, projectId),
    tagSvc.listPostTags(ctx, projectId, postId),
    commentSvc.listComments(projectId, postId, { includeInternal: true }),
    postSvc.listPosts(ctx, projectId, {}),
    postSvc.getDedupSuggestions(ctx, projectId, postId),
    integrations.listIntegrations(ctx, projectId),
    integrations.getPostIssue(ctx, projectId, postId),
    postSvc.getContext(ctx, projectId, postId),
    storageSvc.listAttachmentsForPost(ctx, projectId, postId),
  ])
  const contextEntries = Object.entries(context.context ?? {})
  const hasContext = !!context.appVersion || contextEntries.length > 0
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

          {attachments.length > 0 && (
            <Card className="p-6">
              <SectionLabel>Screenshots</SectionLabel>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {attachments.map((a) => (
                  <a
                    key={a.id}
                    href={`/admin-media/${a.id}?projectId=${projectId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="group block overflow-hidden rounded-xl border border-line transition hover:border-accent"
                  >
                    {/* biome-ignore lint/performance/noImgElement: admin-only, auth-gated byte stream */}
                    <img
                      src={`/admin-media/${a.id}?projectId=${projectId}`}
                      alt="Bug report screenshot"
                      className="h-32 w-full bg-ink/[0.03] object-cover transition group-hover:opacity-90"
                    />
                  </a>
                ))}
              </div>
            </Card>
          )}

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
                      ? 'rounded-xl border border-accent/25/70 bg-accent-soft p-3.5 text-sm'
                      : 'rounded-xl bg-paper/70 p-3.5 text-sm'
                  }
                >
                  {c.isInternal && (
                    <Badge className="mb-1.5 border-accent/30/60 bg-accent-soft text-accent">
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

          {hasContext && (
            <Card className="p-5">
              <SectionLabel>Context</SectionLabel>
              {context.appVersion && (
                <Link
                  href={`/admin/${projectId}/posts?appVersion=${encodeURIComponent(context.appVersion)}`}
                  className="mb-3 inline-flex"
                >
                  <Badge className="border-accent/30 bg-accent-soft text-accent">
                    v{context.appVersion}
                  </Badge>
                </Link>
              )}
              {contextEntries.length > 0 && (
                <dl className="space-y-1.5 text-[13px]">
                  {contextEntries.map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <dt className="shrink-0 font-medium text-ink-faint">{k}</dt>
                      <dd className="min-w-0 break-words text-right text-ink-soft tabular-nums">
                        {typeof v === 'string' ? v : JSON.stringify(v)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
