import { randomUUID } from 'node:crypto'
import { client, db, endUsers, eq, members, newId, organizations, users } from '@chorala/db'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import {
  AppError,
  type AuthContext,
  apiKeys,
  boards,
  posts,
  projects,
  scoreFields,
  votes,
} from '../src/index.ts'

let orgId: string
let userId: string
let ctx: AuthContext

beforeAll(async () => {
  orgId = newId('organization')
  userId = newId('user')
  const slug = `test-${randomUUID().slice(0, 8)}`
  await db.insert(organizations).values({ id: orgId, slug, name: 'Test Org' })
  await db.insert(users).values({ id: userId, name: 'T', email: `${slug}@example.com` })
  const memberId = newId('member')
  await db.insert(members).values({ id: memberId, orgId, userId, role: 'owner' })
  ctx = { kind: 'session', orgId, userId, memberId, role: 'owner' }
})

afterAll(async () => {
  await db.delete(organizations).where(eq(organizations.id, orgId))
  await db.delete(users).where(eq(users.id, userId))
  await client.end()
})

describe('projects', () => {
  test('create seeds default statuses + starter boards', async () => {
    const project = await projects.createProject(ctx, {
      name: 'P',
      slug: 'p1',
      isPublic: true,
      allowedOrigins: [],
    })
    expect(project?.publicKey).toMatch(/^pk_/)
    const statuses = await import('../src/index.ts').then((m) =>
      m.statuses.listStatuses(ctx, project!.id),
    )
    expect(statuses.length).toBe(5)
    const boards = await import('../src/index.ts').then((m) =>
      m.boards.listBoards(ctx, project!.id),
    )
    expect(boards.map((b) => b.slug).sort()).toEqual(['bugs', 'feature-requests'])
  })

  test('duplicate slug conflicts', async () => {
    await projects.createProject(ctx, {
      name: 'A',
      slug: 'dupe',
      isPublic: true,
      allowedOrigins: [],
    })
    await expect(
      projects.createProject(ctx, { name: 'B', slug: 'dupe', isPublic: true, allowedOrigins: [] }),
    ).rejects.toThrow(AppError)
  })
})

describe('posts + votes', () => {
  test('vote toggle updates denormalized count', async () => {
    const project = await projects.createProject(ctx, {
      name: 'V',
      slug: 'votes',
      isPublic: true,
      allowedOrigins: [],
    })
    const boards = await import('../src/index.ts').then((m) =>
      m.boards.listBoards(ctx, project!.id),
    )
    const boardId = boards[0]!.id
    const post = await posts.createPost(ctx, project!.id, { boardId, title: 'Idea', body: '' })

    const euId = newId('endUser')
    await db.insert(endUsers).values({ id: euId, projectId: project!.id, isAnonymous: true })

    const r1 = await votes.toggleVote(project!.id, post.id, euId)
    expect(r1).toEqual({ voted: true, voteCount: 1 })
    const r2 = await votes.toggleVote(project!.id, post.id, euId)
    expect(r2).toEqual({ voted: false, voteCount: 0 })
  })

  test('merge moves votes to canonical post and dedupes voters', async () => {
    const project = await projects.createProject(ctx, {
      name: 'M',
      slug: 'merge',
      isPublic: true,
      allowedOrigins: [],
    })
    const boards = await import('../src/index.ts').then((m) =>
      m.boards.listBoards(ctx, project!.id),
    )
    const boardId = boards[0]!.id
    const src = await posts.createPost(ctx, project!.id, { boardId, title: 'dup', body: '' })
    const dst = await posts.createPost(ctx, project!.id, { boardId, title: 'canonical', body: '' })

    const eu1 = newId('endUser')
    const eu2 = newId('endUser')
    await db.insert(endUsers).values([
      { id: eu1, projectId: project!.id, isAnonymous: true },
      { id: eu2, projectId: project!.id, isAnonymous: true },
    ])
    await votes.toggleVote(project!.id, src.id, eu1) // vote on source
    await votes.toggleVote(project!.id, dst.id, eu1) // same user on target
    await votes.toggleVote(project!.id, src.id, eu2) // unique to source

    const merged = await posts.mergePost(ctx, project!.id, src.id, dst.id)
    expect(merged.voteCount).toBe(2) // eu1 (deduped) + eu2

    const source = await posts.getPost(ctx, project!.id, src.id)
    expect(source.mergedIntoPostId).toBe(dst.id)
  })

  test('merging a post into itself is rejected', async () => {
    const project = await projects.createProject(ctx, {
      name: 'S',
      slug: 'self',
      isPublic: true,
      allowedOrigins: [],
    })
    const boards = await import('../src/index.ts').then((m) =>
      m.boards.listBoards(ctx, project!.id),
    )
    const post = await posts.createPost(ctx, project!.id, {
      boardId: boards[0]!.id,
      title: 'x',
      body: '',
    })
    await expect(posts.mergePost(ctx, project!.id, post.id, post.id)).rejects.toThrow(AppError)
  })
})

describe('api keys', () => {
  test('create returns a raw key that resolves back to the project', async () => {
    const project = await projects.createProject(ctx, {
      name: 'K',
      slug: 'keys',
      isPublic: true,
      allowedOrigins: [],
    })
    const created = await apiKeys.createApiKey(ctx, project!.id, { name: 'ci', scopes: ['read'] })
    expect(created.key).toMatch(/^hk_/)
    const resolved = await apiKeys.resolveApiKey(created.key)
    expect(resolved?.projectId).toBe(project!.id)
  })

  test('api-key context cannot read a different project', async () => {
    const a = await projects.createProject(ctx, {
      name: 'A',
      slug: 'scope-a',
      isPublic: true,
      allowedOrigins: [],
    })
    const b = await projects.createProject(ctx, {
      name: 'B',
      slug: 'scope-b',
      isPublic: true,
      allowedOrigins: [],
    })
    const keyCtx: AuthContext = { kind: 'apikey', orgId, projectId: a!.id, scopes: ['read'] }
    await expect(projects.getProject(keyCtx, b!.id)).rejects.toThrow(AppError)
  })

  test('weighted score + sort=score (Phase 12)', async () => {
    const project = await projects.createProject(ctx, {
      name: 'Score',
      slug: 'score-p',
      isPublic: true,
      allowedOrigins: [],
    })
    const pid = project!.id
    const boardId = (await boards.listBoards(ctx, pid))[0]!.id
    await scoreFields.createScoreField(ctx, pid, { key: 'reach', label: 'Reach', weight: 1 })
    await scoreFields.createScoreField(ctx, pid, { key: 'effort', label: 'Effort', weight: -1 })
    const lo = await posts.createPost(ctx, pid, { boardId, title: 'Low value', body: '' })
    const hi = await posts.createPost(ctx, pid, { boardId, title: 'High value', body: '' })
    await posts.updatePost(ctx, pid, lo.id, { fields: { reach: 2, effort: 5 } }) // 2-5 = -3
    await posts.updatePost(ctx, pid, hi.id, { fields: { reach: 10, effort: 3 } }) // 10-3 = 7

    const ranked = await posts.listPosts(ctx, pid, { sort: 'score' })
    expect(ranked[0]!.id).toBe(hi.id)
    expect(ranked.find((p) => p.id === hi.id)!.score).toBe(7)
    expect(ranked.find((p) => p.id === lo.id)!.score).toBe(-3)
  })

  test('vote on behalf upserts an end-user and is idempotent', async () => {
    const project = await projects.createProject(ctx, {
      name: 'OnBehalf',
      slug: 'onbehalf-p',
      isPublic: true,
      allowedOrigins: [],
    })
    const pid = project!.id
    const boardId = (await boards.listBoards(ctx, pid))[0]!.id
    const post = await posts.createPost(ctx, pid, { boardId, title: 'Wanted', body: '' })

    const v1 = await votes.voteForUser(ctx, pid, post.id, { email: 'buyer@acme.com' })
    expect(v1.voteCount).toBe(1)
    const v2 = await votes.voteForUser(ctx, pid, post.id, { email: 'buyer@acme.com' })
    expect(v2.voteCount).toBe(1) // same customer → no double count
  })
})
