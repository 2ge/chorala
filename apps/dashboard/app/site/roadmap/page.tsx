import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { RoadmapView } from '@/components/portal-views'
import { getPortalProjectByDomain } from '@/lib/portal'

export default async function SiteRoadmap({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string }>
}) {
  const host = (await headers()).get('host') ?? ''
  const data = await getPortalProjectByDomain(host)
  if (!data) notFound()
  const { locale } = await searchParams
  return (
    <RoadmapView projectId={data.project.id} publicKey={data.project.publicKey} locale={locale} />
  )
}
