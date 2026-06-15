import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { BoardView } from '@/components/portal-views'
import { getPortalProjectByDomain } from '@/lib/portal'

export default async function SiteBoard({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string; tag?: string }>
}) {
  const host = (await headers()).get('host') ?? ''
  const data = await getPortalProjectByDomain(host)
  if (!data) notFound()
  const { locale, tag } = await searchParams
  return (
    <BoardView
      projectId={data.project.id}
      publicKey={data.project.publicKey}
      locale={locale}
      initialTag={tag}
    />
  )
}
