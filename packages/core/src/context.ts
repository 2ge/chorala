import type { MemberRole } from '@chorala/types'

/** The authenticated caller's scope, resolved by the API layer and passed into services. */
export type AuthContext = {
  /** How the caller authenticated. */
  kind: 'session' | 'apikey'
  orgId: string
  /** Present for session auth (a dashboard admin). */
  userId?: string
  memberId?: string
  role?: MemberRole
  /** Present for api-key auth (scoped to one project). */
  projectId?: string
  scopes?: string[]
}

/** Roles allowed to perform org-admin mutations (members, projects, billing, settings). */
export const canManageOrg = (ctx: AuthContext): boolean =>
  ctx.kind === 'session' && (ctx.role === 'owner' || ctx.role === 'admin')

/**
 * Who may moderate content (hide/approve posts & comments, run the moderation queue):
 * org admins, the dedicated `moderator` role, and any `write`-scoped API key (automation).
 */
export const canModerate = (ctx: AuthContext): boolean =>
  (ctx.kind === 'session' &&
    (ctx.role === 'owner' || ctx.role === 'admin' || ctx.role === 'moderator')) ||
  (ctx.kind === 'apikey' && (ctx.scopes?.includes('write') ?? false))
