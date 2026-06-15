import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { PortalShell } from '@/components/portal-views'
import { getPortalProjectByDomain } from '@/lib/portal'

/** A branded letter-mark favicon (project initial on its accent colour) as an inline SVG. */
export function brandFavicon(name: string, brand: string): string {
  const letter = (name.trim()[0] ?? 'F').toUpperCase().replace(/[<>&"]/g, '')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${brand}"/><text x="32" y="47" font-family="Georgia,'Times New Roman',serif" font-size="40" font-weight="700" fill="#fff" text-anchor="middle">${letter}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

// Customer feedback portals get their own (indexable) metadata — they are public, brand
// to the project, and must NOT inherit the admin dashboard's "Chorala — Admin" + noindex.
export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get('host') ?? ''
  const data = await getPortalProjectByDomain(host)
  const name = data?.project.name ?? 'Feedback'
  const brand =
    (data?.project.widgetSettings as { primaryColor?: string })?.primaryColor ?? '#d9512a'
  return {
    title: `${name} — Feedback`,
    description: `Share feedback, ideas, and feature requests for ${name}.`,
    robots: { index: true, follow: true },
    icons: { icon: brandFavicon(name, brand) },
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
