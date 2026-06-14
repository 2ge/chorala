import { ChangelogView } from '@/components/portal-views'

export default async function PortalChangelog({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  return <ChangelogView projectId={projectId} publicKey="" />
}
