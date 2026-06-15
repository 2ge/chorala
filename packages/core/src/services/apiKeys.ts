import { apiKeys, db, eq, generateApiKey, hashApiKey, newId } from '@chorala/db'
import type { CreateApiKeyInput } from '@chorala/types'
import type { AuthContext } from '../context.ts'
import { notFound } from '../errors.ts'
import { recordAudit } from './audit.ts'
import { getProject } from './projects.ts'

/** List a project's API keys — never returns the hash or the raw key. */
export async function listApiKeys(ctx: AuthContext, projectId: string) {
  await getProject(ctx, projectId)
  return db
    .select({
      id: apiKeys.id,
      projectId: apiKeys.projectId,
      name: apiKeys.name,
      prefix: apiKeys.prefix,
      scopes: apiKeys.scopes,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
      updatedAt: apiKeys.updatedAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.projectId, projectId))
}

/** Create a key; the raw `key` is returned exactly once and never stored. */
export async function createApiKey(ctx: AuthContext, projectId: string, input: CreateApiKeyInput) {
  await getProject(ctx, projectId)
  const { key, prefix, hashedKey } = generateApiKey()
  const id = newId('apiKey')
  await db.insert(apiKeys).values({
    id,
    projectId,
    name: input.name,
    hashedKey,
    prefix,
    scopes: input.scopes,
  })
  await recordAudit(ctx, 'apikey.created', id, {
    projectId,
    name: input.name,
    scopes: input.scopes,
  })
  return { id, name: input.name, key, prefix }
}

export async function revokeApiKey(ctx: AuthContext, projectId: string, id: string) {
  await getProject(ctx, projectId)
  const [row] = await db.select().from(apiKeys).where(eq(apiKeys.id, id))
  if (!row || row.projectId !== projectId) throw notFound('API key')
  await db.delete(apiKeys).where(eq(apiKeys.id, id))
  await recordAudit(ctx, 'apikey.revoked', id, { projectId, name: row.name })
  return { id, deleted: true }
}

/** Resolve an API key from a raw `hk_...` string → its project + scopes (used by API auth). */
export async function resolveApiKey(raw: string) {
  const [row] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.hashedKey, hashApiKey(raw)))
  if (!row) return null
  // best-effort last-used stamp
  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, row.id))
  return { projectId: row.projectId, scopes: row.scopes }
}
