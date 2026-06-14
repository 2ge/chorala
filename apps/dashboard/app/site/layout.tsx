import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { PortalShell } from '@/components/portal-views'
import { getPortalProjectByDomain } from '@/lib/portal'

// Customer feedback portals get their own (indexable) metadata — they are public, brand
// to the project, and must NOT inherit the admin dashboard's "Chorala — Admin" + noindex.
export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get('host') ?? ''
  const data = await getPortalProjectByDomain(host)
  const name = data?.project.name ?? 'Feedback'
  return {
    title: `${name} — Feedback`,
    description: `Share feedback, ideas, and feature requests for ${name}.`,
    robots: { index: true, follow: true },
  }
}

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
