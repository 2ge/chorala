import { randomUUID } from 'node:crypto'
import { client, db, eq, integrations as intTable, newId, organizations, projects } from '@heed/db'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { decryptSecret, encryptSecret } from '../src/crypto.ts'
import { type AuthContext, integrations } from '../src/index.ts'

let orgId: string
let projectId: string
let ctx: AuthContext

beforeAll(async () => {
  orgId = newId('organization')
  projectId = newId('project')
  await db
    .insert(organizations)
    .values({ id: orgId, slug: `int-${randomUUID().slice(0, 6)}`, name: 'Int' })
  await db.insert(projects).values({
    id: projectId,
    orgId,
    slug: 'p',
    name: 'P',
    publicKey: `pk_${newId('project')}`,
    endUserJwtSecret: 'x'.repeat(32),
  })
  ctx = { kind: 'session', orgId, role: 'owner' }
})

afterAll(async () => {
  await db.delete(organizations).where(eq(organizations.id, orgId))
  await client.end()
})

describe('secret encryption', () => {
  test('round-trips and is non-deterministic', () => {
    const token = 'ghp_supersecrettoken1234567890'
    const a = encryptSecret(token)
    const b = encryptSecret(token)
    expect(a).not.toBe(b) // fresh IV each time
    expect(a.startsWith('v1:')).toBe(true)
    expect(a).not.toContain(token) // not plaintext at rest
    expect(decryptSecret(a)).toBe(token)
    expect(decryptSecret(b)).toBe(token)
  })
})

describe('github integration', () => {
  test('connect stores repo + encrypted token; never exposes the secret', async () => {
    await integrations.setGithubIntegration(ctx, projectId, {
      repo: '2ge/heed',
      token: 'ghp_abc123def456',
    })

    const list = await integrations.listIntegrations(ctx, projectId)
    expect(list).toHaveLength(1)
    expect(list[0]?.type).toBe('github')
    expect((list[0]?.config as { repo: string }).repo).toBe('2ge/heed')
    expect(list[0]).not.toHaveProperty('secret')

    // the stored secret is encrypted, and decrypts back to the token
    const [row] = await db.select().from(intTable).where(eq(intTable.projectId, projectId))
    expect(row?.secret).toBeTruthy()
    expect(row?.secret).not.toContain('ghp_abc123def456')
    expect(decryptSecret(row?.secret ?? '')).toBe('ghp_abc123def456')
  })

  test('rejects a malformed repo', async () => {
    await expect(
      integrations.setGithubIntegration(ctx, projectId, { repo: 'not-a-repo', token: 't' }),
    ).rejects.toThrow()
  })

  test('updating keeps the existing token when none is provided', async () => {
    await integrations.setGithubIntegration(ctx, projectId, { repo: '2ge/heed2' })
    const [row] = await db.select().from(intTable).where(eq(intTable.projectId, projectId))
    expect((row?.config as { repo: string }).repo).toBe('2ge/heed2')
    expect(decryptSecret(row?.secret ?? '')).toBe('ghp_abc123def456')
  })

  test('disconnect removes it', async () => {
    await integrations.removeGithubIntegration(ctx, projectId)
    expect(await integrations.listIntegrations(ctx, projectId)).toHaveLength(0)
  })
})
