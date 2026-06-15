import {
  type AuthContext,
  apiKeys,
  boards as boardSvc,
  posts as postSvc,
  projects,
} from '@chorala/core'
import { db, eq, members, projects as projectsTable } from '@chorala/db'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createApp } from '../src/app.ts'
import { redis } from '../src/lib/redis.ts'

const app = createApp()
let auth: Record<string, string>
let projectId: string
let boardId: string

beforeAll(async () => {
  // Build a session ctx from the seed org, then spin up an isolated throwaway project.
  const [acme] = await db.select().from(projectsTable).where(eq(projectsTable.slug, 'acme'))
  if (!acme) throw new Error('seed project missing — run `pnpm db:seed`')
  const [m] = await db.select().from(members).where(eq(members.orgId, acme.orgId))
  if (!m) throw new Error('no member for the seed org')
  const ctx: AuthContext = {
    kind: 'session',
    orgId: acme.orgId,
    userId: m.userId,
    memberId: m.id,
    role: m.role,
  }
  const project = await projects.createProject(ctx, {
    name: 'Admin Test',
    slug: `admin-test-${Date.now()}`,
    isPublic: true,
    allowedOrigins: [],
  })
  projectId = project!.id
  boardId = (await boardSvc.listBoards(ctx, projectId))[0]!.id
  await postSvc.createPost(ctx, projectId, { boardId, title: 'Seed post', body: '' })
  const key = await apiKeys.createApiKey(ctx, projectId, {
    name: 'test',
    scopes: ['read', 'write'],
  })
  auth = { authorization: `Bearer ${key.key}`, 'content-type': 'application/json' }
})

afterAll(async () => {
  await db.delete(projectsTable).where(eq(projectsTable.id, projectId)) // cascades
  await redis.quit()
})

const base = () => `/api/v1/projects/${projectId}`

describe('admin auth', () => {
  test('a bad bearer token is rejected', async () => {
    const res = await app.request(`${base()}/posts`, {
      headers: { authorization: 'Bearer hk_nope' },
    })
    expect(res.status).toBe(401)
  })
})

describe('score fields (Phase 12)', () => {
  test('CRUD + the score shows up on the post list', async () => {
    const create = await app.request(`${base()}/score-fields`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ key: 'reach', label: 'Reach', weight: 2 }),
    })
    expect(create.status).toBe(201)
    const field = (await create.json()) as { id: string; key: string }
    expect(field.key).toBe('reach')

    const list = await app.request(`${base()}/score-fields`, { headers: auth })
    expect(((await list.json()) as unknown[]).length).toBe(1)

    // set a value on the seed post and confirm score = value × weight
    const posts = (await (await app.request(`${base()}/posts`, { headers: auth })).json()) as {
      id: string
    }[]
    await app.request(`${base()}/posts/${posts[0]!.id}`, {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({ fields: { reach: 5 } }),
    })
    const scored = (await (
      await app.request(`${base()}/posts?sort=score`, { headers: auth })
    ).json()) as { score: number }[]
    expect(scored[0]!.score).toBe(10)

    const del = await app.request(`${base()}/score-fields/${field.id}`, {
      method: 'DELETE',
      headers: auth,
    })
    expect(del.status).toBe(200)
  })
})

describe('segments (Phase 13)', () => {
  test('preview + create + list', async () => {
    const preview = await app.request(`${base()}/segments/preview`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ match: 'all', rules: [{ field: 'plan', op: 'eq', value: 'pro' }] }),
    })
    expect(preview.status).toBe(200)
    expect((await preview.json()) as { matchCount: number }).toHaveProperty('matchCount')

    const create = await app.request(`${base()}/segments`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        name: 'Pros',
        definition: { match: 'all', rules: [{ field: 'plan', op: 'eq', value: 'pro' }] },
      }),
    })
    expect(create.status).toBe(201)
    const list = (await (await app.request(`${base()}/segments`, { headers: auth })).json()) as {
      matchCount: number
    }[]
    expect(list).toHaveLength(1)
    expect(list[0]).toHaveProperty('matchCount')
  })
})

describe('companies + CSV export', () => {
  test('companies list is an (empty) array', async () => {
    const res = await app.request(`${base()}/companies`, { headers: auth })
    expect(res.status).toBe(200)
    expect(Array.isArray(await res.json())).toBe(true)
  })

  test('CSV export returns text/csv with a header row', async () => {
    const res = await app.request(`${base()}/posts?format=csv`, { headers: auth })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/csv')
    const body = await res.text()
    expect(body.split('\n')[0]).toContain('Title,Board,Status,Votes')
  })
})

describe('vote on behalf (Phase 12)', () => {
  test('records a vote for a customer by email', async () => {
    const posts = (await (await app.request(`${base()}/posts`, { headers: auth })).json()) as {
      id: string
    }[]
    const res = await app.request(`${base()}/posts/${posts[0]!.id}/vote-for`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ email: 'buyer@acme.com' }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { voted: boolean; voteCount: number }
    expect(body.voted).toBe(true)
    expect(body.voteCount).toBe(1)
  })
})
