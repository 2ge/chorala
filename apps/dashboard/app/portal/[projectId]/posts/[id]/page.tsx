import { notFound } from 'next/navigation'
import { PostDetailView } from '@/components/portal-views'
import { getPortalProject } from '@/lib/portal'

export default async function PortalPostDetail({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; id: string }>
  searchParams: Promise<{ locale?: string }>
}) {
  const { projectId, id } = await params
  const { locale } = await searchParams
  const data = await getPortalProject(projectId)
  if (!data) notFound()
  return (
    <PostDetailView
      projectId={projectId}
      publicKey={data.project.publicKey}
      postId={id}
      locale={locale}
      basePath={`/portal/${projectId}/`}
    />
  )
}
