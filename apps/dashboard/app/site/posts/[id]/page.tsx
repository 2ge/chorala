import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { PostDetailView } from '@/components/portal-views'
import { getPortalProjectByDomain } from '@/lib/portal'

export default async function SitePostDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ locale?: string }>
}) {
  const host = (await headers()).get('host') ?? ''
  const data = await getPortalProjectByDomain(host)
  if (!data) notFound()
  const { id } = await params
  const { locale } = await searchParams
  return (
    <PostDetailView
      projectId={data.project.id}
      publicKey={data.project.publicKey}
      postId={id}
      locale={locale}
      basePath="/"
    />
  )
}
