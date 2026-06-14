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
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-500">Top ideas</h2>
      {posts.length === 0 && <p className="text-slate-400">No ideas yet.</p>}
      {posts.map((p) => (
        <div
          key={p.id}
          className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4"
        >
          <PortalVote
            publicKey={data.project.publicKey}
            postId={p.id}
            count={p.voteCount}
            voted={!!p.hasVoted}
          />
          <div>
            <p className="font-medium">{p.title}</p>
            {p.body && <p className="mt-1 text-sm text-slate-500">{p.body}</p>}
            <p className="mt-1 text-xs text-slate-400">{p.commentCount} comments</p>
          </div>
        </div>
      ))}
    </div>
  )
}
