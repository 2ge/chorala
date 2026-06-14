import { and, db, eq, organizations, projects } from '@heed/db'

async function withOrg(project: typeof projects.$inferSelect | undefined) {
  if (!project || !project.isPublic) return null
  const [org] = await db.select().from(organizations).where(eq(organizations.id, project.orgId))
  return { project, locales: org?.locales ?? ['en'], defaultLocale: org?.defaultLocale ?? 'en' }
}

/** Fetch a public project (+ its org locales) for the portal — no admin auth required. */
export async function getPortalProject(projectId: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
  return withOrg(project)
}

/** Resolve a public project by its custom domain (Host header) — powers feedback.musicaha.com. */
export async function getPortalProjectByDomain(host: string) {
  const domain = host.toLowerCase().split(':')[0]
  if (!domain) return null
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.customDomain, domain), eq(projects.isPublic, true)))
  return withOrg(project)
}
