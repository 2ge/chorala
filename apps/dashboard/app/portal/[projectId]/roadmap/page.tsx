import { RoadmapView } from '@/components/portal-views'

export default async function PortalRoadmap({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>
  searchParams: Promise<{ locale?: string }>
}) {
  const { projectId } = await params
  const { locale } = await searchParams
  return <RoadmapView projectId={projectId} publicKey="" locale={locale} />
}
