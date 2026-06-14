import { db, eq, organizations, projects } from '@heed/db'

/** Fetch a public project (+ its org locales) for the portal — no admin auth required. */
export async function getPortalProject(projectId: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
  if (!project || !project.isPublic) return null
  const [org] = await db.select().from(organizations).where(eq(organizations.id, project.orgId))
  return { project, locales: org?.locales ?? ['en'], defaultLocale: org?.defaultLocale ?? 'en' }
}
