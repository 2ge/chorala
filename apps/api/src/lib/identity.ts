import { env } from '@chorala/config'
import { endUsers, unauthorized } from '@chorala/core'
import type { Context } from 'hono'
import { getSignedCookie, setSignedCookie } from 'hono/cookie'
import type { PublicProject } from '../types.ts'
import { verifyEndUserJwt } from './jwt.ts'

const COOKIE = 'chorala_uid'

/** Resolve the calling end-user WITHOUT creating one: host JWT first, then signed cookie. */
export async function resolveEndUser(c: Context, project: PublicProject) {
  const jwt = c.req.header('x-chorala-user')
  if (jwt) {
    try {
      const payload = await verifyEndUserJwt(jwt, project.endUserJwtSecret)
      return await endUsers.upsertFromIdentity(project.id, payload)
    } catch {
      throw unauthorized('Invalid end-user token')
    }
  }
  const uid = await getSignedCookie(c, env.CHORALA_AUTH_SECRET, COOKIE)
  if (uid) {
    const existing = await endUsers.getById(project.id, uid)
    if (existing) return existing
  }
  return null
}

/** Resolve OR create an anonymous end-user (sets a signed cookie). For write endpoints. */
export async function requireEndUser(c: Context, project: PublicProject) {
  const existing = await resolveEndUser(c, project)
  if (existing) return existing

  const locale = c.req.header('accept-language')?.slice(0, 2) || 'en'
  const anon = await endUsers.createAnonymous(project.id, locale)
  await setSignedCookie(c, COOKIE, anon.id, env.CHORALA_AUTH_SECRET, {
    httpOnly: true,
    sameSite: 'None',
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  return anon
}
