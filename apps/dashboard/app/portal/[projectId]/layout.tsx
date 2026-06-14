import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { PortalShell } from '@/components/portal-views'
import { getPortalProject } from '@/lib/portal'

export default async function PortalLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const data = await getPortalProject(projectId)
  if (!data) notFound()
  const brand = (data.project.widgetSettings as { primaryColor?: string }).primaryColor ?? '#d9512a'
  return (
    <PortalShell name={data.project.name} brand={brand} basePath={`/portal/${projectId}/`}>
      {children}
    </PortalShell>
  )
}
