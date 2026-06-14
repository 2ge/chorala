import { and, db, endUsers, eq, newId } from '@chorala/db'
import { badRequest } from '../errors.ts'

/** Identity claims carried by the host-signed end-user JWT (SPEC §8.2). */
export type Identity = {
  id: string
  email?: string
  name?: string
  avatar?: string
  segment?: Record<string, unknown>
}

/** Upsert an identified end-user keyed by (project, externalId). */
export async function upsertFromIdentity(projectId: string, identity: Identity) {
  const [existing] = await db
    .select()
    .from(endUsers)
    .where(and(eq(endUsers.projectId, projectId), eq(endUsers.externalId, identity.id)))

  if (existing) {
    const [row] = await db
      .update(endUsers)
      .set({
        email: identity.email ?? existing.email,
        name: identity.name ?? existing.name,
        avatarUrl: identity.avatar ?? existing.avatarUrl,
        segment: identity.segment ?? existing.segment,
        isAnonymous: false,
      })
      .where(eq(endUsers.id, existing.id))
      .returning()
    if (!row) throw badRequest('Failed to update end user')
    return row
  }

  const [row] = await db
    .insert(endUsers)
    .values({
      id: newId('endUser'),
      projectId,
      externalId: identity.id,
      email: identity.email,
      name: identity.name,
      avatarUrl: identity.avatar,
      segment: identity.segment ?? {},
      isAnonymous: false,
    })
    .returning()
  if (!row) throw badRequest('Failed to create end user')
  return row
}

/** Create an anonymous end-user (cookie-backed voter). */
export async function createAnonymous(projectId: string, locale = 'en') {
  const [row] = await db
    .insert(endUsers)
    .values({ id: newId('endUser'), projectId, isAnonymous: true, locale })
    .returning()
  if (!row) throw badRequest('Failed to create anonymous end user')
  return row
}

/** Fetch an end-user scoped to a project (returns null if not found / wrong project). */
export async function getById(projectId: string, id: string) {
  const [row] = await db
    .select()
    .from(endUsers)
    .where(and(eq(endUsers.id, id), eq(endUsers.projectId, projectId)))
  return row ?? null
}
