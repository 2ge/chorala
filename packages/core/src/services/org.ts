import { db, eq, organizations } from '@chorala/db'
import type { UpdateOrgSettingsInput } from '@chorala/types'
import { type AuthContext, canManageOrg } from '../context.ts'
import { forbidden, notFound } from '../errors.ts'

export async function getOrg(ctx: AuthContext) {
  const [row] = await db.select().from(organizations).where(eq(organizations.id, ctx.orgId))
  if (!row) throw notFound('Organization')
  return row
}

export async function updateOrgSettings(ctx: AuthContext, input: UpdateOrgSettingsInput) {
  if (!canManageOrg(ctx)) throw forbidden('Only org admins can update settings')
  const [row] = await db
    .update(organizations)
    .set({
      name: input.name,
      defaultLocale: input.defaultLocale,
      locales: input.locales,
      settings: input.settings,
    })
    .where(eq(organizations.id, ctx.orgId))
    .returning()
  return row
}
