import { type AuthContext, apiKeys, unauthorized } from '@heed/core'
import { db, eq, members, projects } from '@heed/db'
import type { MiddlewareHandler } from 'hono'
import { auth } from '../auth.ts'
import type { AppEnv } from '../types.ts'

/** Resolves a Better Auth session cookie OR an `Authorization: Bearer hk_...` API key
 *  into an AuthContext, scoped to the caller's org (and project, for api keys). */
export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const authz = c.req.header('authorization')

  // --- API key path ---
  if (authz?.startsWith('Bearer hk_')) {
    const resolved = await apiKeys.resolveApiKey(authz.slice('Bearer '.length))
    if (!resolved) throw unauthorized('Invalid API key')
    const [proj] = await db
      .select({ orgId: projects.orgId })
      .from(projects)
      .where(eq(projects.id, resolved.projectId))
    if (!proj) throw unauthorized('Invalid API key')
    c.set('auth', {
      kind: 'apikey',
      orgId: proj.orgId,
      projectId: resolved.projectId,
      scopes: resolved.scopes,
    } satisfies AuthContext)
    return next()
  }

  // --- Session cookie path ---
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session?.user) throw unauthorized()

  const orgHeader = c.req.header('x-heed-org')
  const rows = await db.select().from(members).where(eq(members.userId, session.user.id))
  const membership = orgHeader ? rows.find((m) => m.orgId === orgHeader) : rows[0]
  if (!membership) throw unauthorized('User is not a member of any organization')

  c.set('auth', {
    kind: 'session',
    orgId: membership.orgId,
    userId: session.user.id,
    memberId: membership.id,
    role: membership.role,
  } satisfies AuthContext)
  return next()
}
