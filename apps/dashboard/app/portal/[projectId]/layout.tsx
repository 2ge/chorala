import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { brandFavicon } from '@/app/site/layout'
import { PortalShell } from '@/components/portal-views'
import { getPortalProject } from '@/lib/portal'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>
}): Promise<Metadata> {
  const data = await getPortalProject((await params).projectId)
  const name = data?.project.name ?? 'Feedback'
  const brand =
    (data?.project.widgetSettings as { primaryColor?: string })?.primaryColor ?? '#d9512a'
  return { title: `${name} — Feedback`, icons: { icon: brandFavicon(name, brand) } }
}

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
