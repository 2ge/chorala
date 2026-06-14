import { publicFeed } from '@heed/core'
import { notFound } from 'next/navigation'
import { PortalVote } from '@/components/portal-client'
import { getPortalProject } from '@/lib/portal'

export default async function PortalBoard({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>
  searchParams: Promise<{ locale?: string }>
}) {
  const { projectId } = await params
  const { locale } = await searchParams
  const data = await getPortalProject(projectId)
  if (!data) notFound()
  const { posts } = await publicFeed.listPublicBoards(projectId, { locale, sort: 'top' })

  return (
    <div>
      <div className="mb-5">
        <h2 className="font-display text-3xl tracking-[-0.02em]">Ideas</h2>
        <p className="mt-1 text-sm text-ink-soft">Vote for what you want us to build next.</p>
      </div>
      <div className="space-y-2.5">
        {posts.length === 0 && <p className="text-ink-faint">No ideas yet — be the first.</p>}
        {posts.map((p) => (
          <div
            key={p.id}
            className="surface flex items-start gap-4 p-4 transition hover:-translate-y-0.5"
          >
            <PortalVote
              publicKey={data.project.publicKey}
              postId={p.id}
              count={p.voteCount}
              voted={!!p.hasVoted}
            />
            <div className="min-w-0 pt-0.5">
              <p className="font-medium tracking-[-0.01em]">{p.title}</p>
              {p.body && <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{p.body}</p>}
              <p className="mt-1.5 text-xs text-ink-faint">{p.commentCount} comments</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
