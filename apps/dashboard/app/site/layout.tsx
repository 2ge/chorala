import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { PortalShell } from '@/components/portal-views'
import { getPortalProjectByDomain } from '@/lib/portal'

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const host = (await headers()).get('host') ?? ''
  const data = await getPortalProjectByDomain(host)
  if (!data) notFound()
  const brand = (data.project.widgetSettings as { primaryColor?: string }).primaryColor ?? '#d9512a'
  return (
    <PortalShell name={data.project.name} brand={brand} basePath="/">
      {children}
    </PortalShell>
  )
}
