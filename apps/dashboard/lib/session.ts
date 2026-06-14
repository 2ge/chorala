import type { AuthContext } from '@heed/core'
import { db, eq, members, organizations } from '@heed/db'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from './auth'

export async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user ?? null
}

/** Resolve the signed-in admin into an org-scoped AuthContext, or redirect to /login. */
export async function requireAuthContext(): Promise<AuthContext> {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  const rows = await db.select().from(members).where(eq(members.userId, user.id))
  const membership = rows[0]
  if (!membership) redirect('/login')
  return {
    kind: 'session',
    orgId: membership.orgId,
    userId: user.id,
    memberId: membership.id,
    role: membership.role,
  }
}

export async function getOrg(ctx: AuthContext) {
  const [org] = await db.select().from(organizations).where(eq(organizations.id, ctx.orgId))
  return org ?? null
}
