import { publicFeed } from '@heed/core'
import { notFound } from 'next/navigation'
import { SubscribeForm } from '@/components/portal-client'
import { getPortalProject } from '@/lib/portal'

export default async function PortalChangelog({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const data = await getPortalProject(projectId)
  if (!data) notFound()
  const entries = await publicFeed.getPublicChangelog(projectId)

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-2 text-sm font-semibold">Subscribe to updates</p>
        <SubscribeForm projectId={projectId} />
      </div>
      {entries.length === 0 && <p className="text-slate-400">No changelog entries yet.</p>}
      {entries.map((e) => (
        <article key={e.id} className="border-b border-slate-200 pb-5">
          <div className="mb-1 flex items-center gap-2">
            {e.labels.map((l) => (
              <span
                key={l}
                className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500"
              >
                {l}
              </span>
            ))}
            {e.publishedAt && (
              <span className="text-xs text-slate-400">
                {new Date(e.publishedAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <h2 className="text-lg font-bold">{e.title}</h2>
          <p className="mt-1 whitespace-pre-wrap text-slate-600">{e.body}</p>
        </article>
      ))}
    </div>
  )
}
