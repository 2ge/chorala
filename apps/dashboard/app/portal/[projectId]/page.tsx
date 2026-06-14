import { notFound } from 'next/navigation'
import { BoardView } from '@/components/portal-views'
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
  return <BoardView projectId={projectId} publicKey={data.project.publicKey} locale={locale} />
}
