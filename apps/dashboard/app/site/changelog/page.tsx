import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { ChangelogView } from '@/components/portal-views'
import { getPortalProjectByDomain } from '@/lib/portal'

export default async function SiteChangelog() {
  const host = (await headers()).get('host') ?? ''
  const data = await getPortalProjectByDomain(host)
  if (!data) notFound()
  return <ChangelogView projectId={data.project.id} publicKey={data.project.publicKey} />
}
