import { assertSeatAvailable } from '@chorala/billing'
import { and, db, eq, members, newId, users } from '@chorala/db'
import type { InviteMemberInput, MemberRole } from '@chorala/types'
import { type AuthContext, canManageOrg } from '../context.ts'
import { conflict, forbidden, notFound } from '../errors.ts'

export async function listMembers(ctx: AuthContext) {
  return db
    .select({
      id: members.id,
      orgId: members.orgId,
      userId: members.userId,
      role: members.role,
      email: users.email,
      name: users.name,
      createdAt: members.createdAt,
      updatedAt: members.updatedAt,
    })
    .from(members)
    .innerJoin(users, eq(users.id, members.userId))
    .where(eq(members.orgId, ctx.orgId))
}

/**
 * Invite a member by email. Creates the Better Auth user if needed (they set a password
 * via the invite email later) and the org membership. Cloud public-signup is separate.
 */
export async function inviteMember(ctx: AuthContext, input: InviteMemberInput) {
  if (!canManageOrg(ctx)) throw forbidden('Only org admins can invite members')
  // Cloud: enforce admin-seat limit. Self-host: no-op (unlimited admins).
  await assertSeatAvailable(ctx.orgId)

  let [user] = await db.select().from(users).where(eq(users.email, input.email))
  if (!user) {
    const id = newId('user')
    ;[user] = await db
      .insert(users)
      .values({ id, email: input.email, name: input.email.split('@')[0] ?? input.email })
      .returning()
  }
  if (!user) throw conflict('Could not resolve user')

  const [existing] = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.orgId, ctx.orgId), eq(members.userId, user.id)))
  if (existing) throw conflict('User is already a member of this organization')

  const [member] = await db
    .insert(members)
    .values({ id: newId('member'), orgId: ctx.orgId, userId: user.id, role: input.role })
    .returning()
  return member
}

export async function updateMemberRole(ctx: AuthContext, memberId: string, role: MemberRole) {
  if (!canManageOrg(ctx)) throw forbidden('Only org admins can change roles')
  const member = await getMemberInOrg(ctx.orgId, memberId)
  if (member.role === 'owner' && role !== 'owner') await assertNotLastOwner(ctx.orgId, memberId)
  const [row] = await db.update(members).set({ role }).where(eq(members.id, memberId)).returning()
  return row
}

export async function removeMember(ctx: AuthContext, memberId: string) {
  if (!canManageOrg(ctx)) throw forbidden('Only org admins can remove members')
  const member = await getMemberInOrg(ctx.orgId, memberId)
  if (member.role === 'owner') await assertNotLastOwner(ctx.orgId, memberId)
  await db.delete(members).where(eq(members.id, memberId))
  return { id: memberId, deleted: true }
}

async function getMemberInOrg(orgId: string, memberId: string) {
  const [row] = await db.select().from(members).where(eq(members.id, memberId))
  if (!row || row.orgId !== orgId) throw notFound('Member')
  return row
}

async function assertNotLastOwner(orgId: string, memberId: string) {
  const owners = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.orgId, orgId), eq(members.role, 'owner')))
  if (owners.length <= 1 && owners.some((o) => o.id === memberId)) {
    throw conflict('Cannot remove or demote the last owner')
  }
}
