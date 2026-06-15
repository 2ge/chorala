import { randomUUID } from 'node:crypto'
import {
  client,
  companies,
  db,
  endUsers,
  eq,
  members,
  newId,
  organizations,
  posts as postsTable,
  users,
} from '@chorala/db'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import {
  type AuthContext,
  boards,
  changelog,
  companies as companySvc,
  endUsers as endUserSvc,
  posts,
  projects,
  segments,
  storage,
  votes,
} from '../src/index.ts'

let ctx: AuthContext
let orgId: string
let userId: string

// A 1×1 transparent PNG data URL.
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

async function newProject(slug: string) {
  const p = await projects.createProject(ctx, {
    name: slug,
    slug: `${slug}-${randomUUID().slice(0, 6)}`,
    isPublic: true,
    allowedOrigins: [],
  })
  if (!p) throw new Error('project create failed')
  return p
}
const boardId = async (pid: string) => (await boards.listBoards(ctx, pid))[0]!.id

/** Insert an identified end-user directly (optionally in a company). */
async function mkUser(
  pid: string,
  over: Partial<typeof endUsers.$inferInsert> = {},
): Promise<string> {
  const id = newId('endUser')
  await db.insert(endUsers).values({ id, projectId: pid, isAnonymous: false, ...over })
  return id
}

beforeAll(async () => {
  orgId = newId('organization')
  userId = newId('user')
  const slug = `cov-${randomUUID().slice(0, 8)}`
  await db.insert(organizations).values({ id: orgId, slug, name: 'Coverage Org' })
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

describe('companies + identify (Phase 11)', () => {
  test('identify upserts a company, links the user, and is idempotent', async () => {
    const p = await newProject('ident')
    const eu1 = await endUserSvc.upsertFromIdentity(p.id, {
      id: 'u-1',
      email: 'a@globex.com',
      company: { id: 'globex', name: 'Globex', mrr: 1000, plan: 'pro' },
    })
    expect(eu1.companyId).toMatch(/^co_/)

    // a second identify for the same external company updates MRR, does not duplicate
    await endUserSvc.upsertFromIdentity(p.id, {
      id: 'u-2',
      email: 'b@globex.com',
      company: { id: 'globex', mrr: 2500 },
    })
    const cos = await db.select().from(companies).where(eq(companies.projectId, p.id))
    expect(cos).toHaveLength(1)
    expect(cos[0]!.mrr).toBe(2500)
  })

  test('listCompanies rollups (users + posts)', async () => {
    const p = await newProject('rollup')
    const co = newId('company')
    await db
      .insert(companies)
      .values({ id: co, projectId: p.id, name: 'Initech', plan: 'pro', mrr: 9000 })
    const u1 = await mkUser(p.id, { companyId: co, email: 'p1@initech.com' })
    await mkUser(p.id, { companyId: co, email: 'p2@initech.com' })
    await posts.createPost(ctx, p.id, {
      boardId: await boardId(p.id),
      title: 'From Initech',
      body: '',
    })
    // attribute a post to u1 (createPost is admin-authored, so set author directly)
    const postId = newId('post')
    await db.insert(postsTable).values({
      id: postId,
      projectId: p.id,
      boardId: await boardId(p.id),
      title: 'Initech idea',
      authorEndUserId: u1,
    })
    const list = await companySvc.listCompanies(ctx, p.id)
    const row = list.find((c) => c.id === co)!
    expect(row.userCount).toBe(2)
    expect(row.postCount).toBe(1)
  })

  test('updateCompany edits MRR/plan; getPostCustomer returns author + company', async () => {
    const p = await newProject('cust')
    const co = newId('company')
    await db
      .insert(companies)
      .values({ id: co, projectId: p.id, name: 'Hooli', plan: 'free', mrr: 0 })
    await companySvc.updateCompany(ctx, p.id, co, { mrr: 4200, plan: 'enterprise' })
    const after = await companySvc.getCompany(ctx, p.id, co)
    expect(after.mrr).toBe(4200)
    expect(after.plan).toBe('enterprise')

    const eu = await mkUser(p.id, { companyId: co, name: 'Gavin', email: 'gavin@hooli.com' })
    const postId = newId('post')
    await db.insert(postsTable).values({
      id: postId,
      projectId: p.id,
      boardId: await boardId(p.id),
      title: 'q',
      authorEndUserId: eu,
    })
    const customer = await posts.getPostCustomer(ctx, p.id, postId)
    expect(customer.endUser?.name).toBe('Gavin')
    expect(customer.company?.id).toBe(co)
    expect(customer.company?.mrr).toBe(4200)
  })
})

describe('revenue impact + author-company filters (Phase 11)', () => {
  test('revenueImpact counts each company once; filters target the author', async () => {
    const p = await newProject('rev')
    const coA = newId('company')
    const coB = newId('company')
    await db.insert(companies).values([
      { id: coA, projectId: p.id, name: 'A', plan: 'pro', mrr: 1000 },
      { id: coB, projectId: p.id, name: 'B', plan: 'free', mrr: 500 },
    ])
    const a1 = await mkUser(p.id, { companyId: coA, email: 'a1@a.com' })
    const a2 = await mkUser(p.id, { companyId: coA, email: 'a2@a.com' })
    const b1 = await mkUser(p.id, { companyId: coB, email: 'b1@b.com' })

    // a post authored by a pro-company (A) user; all three vote on it
    const postId = newId('post')
    await db.insert(postsTable).values({
      id: postId,
      projectId: p.id,
      boardId: await boardId(p.id),
      title: 'Wanted',
      authorEndUserId: a1,
    })
    for (const eu of [a1, a2, b1]) await votes.setVote(p.id, postId, eu, true)

    const ranked = await posts.listPosts(ctx, p.id, {})
    const row = ranked.find((r) => r.id === postId)!
    expect(row.voteCount).toBe(3)
    expect(row.revenueImpact).toBe(1500) // A (1000, counted once for 2 voters) + B (500)

    // author-company filters operate on the post AUTHOR's company (A = pro)
    expect((await posts.listPosts(ctx, p.id, { plan: 'pro' })).some((r) => r.id === postId)).toBe(
      true,
    )
    expect((await posts.listPosts(ctx, p.id, { plan: 'free' })).some((r) => r.id === postId)).toBe(
      false,
    )
    expect((await posts.listPosts(ctx, p.id, { minMrr: 800 })).some((r) => r.id === postId)).toBe(
      true,
    )
    expect((await posts.listPosts(ctx, p.id, { minMrr: 5000 })).some((r) => r.id === postId)).toBe(
      false,
    )
  })
})

describe('attachments (Phase 10)', () => {
  test('upload decodes + sizes + dims; rejects non-images and junk', async () => {
    const p = await newProject('att')
    const eu = await mkUser(p.id, { email: 'rep@x.com' })
    const att = await storage.createPublicAttachment(p.id, eu, { dataUrl: PNG, kind: 'screenshot' })
    expect(att.mimeType).toBe('image/png')
    expect(att.byteSize).toBeGreaterThan(0)
    expect(att.width).toBe(1)
    expect(att.height).toBe(1)
    expect(await storage.projectStorageUsage(p.id)).toBe(att.byteSize)

    await expect(
      storage.createPublicAttachment(p.id, eu, {
        dataUrl: 'data:application/pdf;base64,JVBERi0=',
        kind: 'file',
      }),
    ).rejects.toThrow()
    await expect(
      storage.createPublicAttachment(p.id, eu, { dataUrl: 'not-a-data-url', kind: 'file' }),
    ).rejects.toThrow()
  })

  test('link is scoped to the uploader; admin can list + read bytes', async () => {
    const p = await newProject('attlink')
    const owner = await mkUser(p.id, { email: 'owner@x.com' })
    const other = await mkUser(p.id, { email: 'other@x.com' })
    const att = await storage.createPublicAttachment(p.id, owner, {
      dataUrl: PNG,
      kind: 'screenshot',
    })
    const postId = newId('post')
    await db
      .insert(postsTable)
      .values({ id: postId, projectId: p.id, boardId: await boardId(p.id), title: 'bug' })

    // a different end-user cannot attach the owner's upload
    await storage.linkAttachmentsToPost(p.id, other, [att.id], postId)
    expect(await storage.listAttachmentsForPost(ctx, p.id, postId)).toHaveLength(0)
    // the owner can
    await storage.linkAttachmentsToPost(p.id, owner, [att.id], postId)
    const linked = await storage.listAttachmentsForPost(ctx, p.id, postId)
    expect(linked).toHaveLength(1)

    const bytes = await storage.readAttachment(ctx, p.id, att.id)
    expect(bytes.mimeType).toBe('image/png')
    expect(bytes.bytes.byteLength).toBe(att.byteSize)
  })
})

describe('segment resolver matrix (Phase 13)', () => {
  test('every field + match all/any + empty rules', async () => {
    const p = await newProject('seg')
    const coPro = newId('company')
    const coFree = newId('company')
    await db.insert(companies).values([
      { id: coPro, projectId: p.id, name: 'Pro Inc', plan: 'pro', mrr: 5000 },
      { id: coFree, projectId: p.id, name: 'Free Inc', plan: 'free', mrr: 0 },
    ])
    await mkUser(p.id, { email: 'ann@acme.com', locale: 'en', companyId: coPro })
    await mkUser(p.id, { email: 'bea@acme.fr', locale: 'fr', companyId: coPro })
    await mkUser(p.id, { email: 'cy@other.com', locale: 'en', companyId: coFree })
    await mkUser(p.id, { email: 'dan@nowhere.com', locale: 'en' }) // no company

    const m = async (
      rules: { field: string; op: string; value: string }[],
      match: 'all' | 'any' = 'all',
    ) =>
      // biome-ignore lint/suspicious/noExplicitAny: test passes a literal definition
      segments.matchCount(p.id, { match, rules } as any)

    expect(await m([{ field: 'plan', op: 'eq', value: 'pro' }])).toBe(2)
    expect(await m([{ field: 'plan', op: 'neq', value: 'pro' }])).toBe(1) // free (the no-company user has null plan)
    expect(await m([{ field: 'mrr', op: 'gte', value: '1000' }])).toBe(2)
    expect(await m([{ field: 'mrr', op: 'lt', value: '1000' }])).toBe(2) // free(0) + no-company(0)
    expect(await m([{ field: 'locale', op: 'eq', value: 'fr' }])).toBe(1)
    expect(await m([{ field: 'email_domain', op: 'eq', value: 'acme.com' }])).toBe(1)
    expect(await m([{ field: 'has_company', op: 'eq', value: 'true' }])).toBe(3)
    expect(await m([{ field: 'has_company', op: 'eq', value: 'false' }])).toBe(1)

    // match any: pro OR french-locale
    expect(
      await m(
        [
          { field: 'plan', op: 'eq', value: 'free' },
          { field: 'locale', op: 'eq', value: 'fr' },
        ],
        'any',
      ),
    ).toBe(2) // cy (free) + bea (fr)

    // empty rules → everyone
    expect(await m([])).toBe(4)

    // resolveSegment respects withEmailOnly + returns attributes for variables
    const recips = await segments.resolveSegment(
      p.id,
      // biome-ignore lint/suspicious/noExplicitAny: literal definition
      { match: 'all', rules: [{ field: 'email_domain', op: 'eq', value: 'acme.fr' }] } as any,
      { withEmailOnly: true },
    )
    expect(recips).toHaveLength(1)
    expect(recips[0]!.plan).toBe('pro')
    expect(recips[0]!.companyName).toBe('Pro Inc')
  })
})

describe('changelog targeting (Phase 13)', () => {
  test('createChangelog stores the segmentId', async () => {
    const p = await newProject('cl')
    const seg = await segments.createSegment(ctx, p.id, {
      name: 'Pros',
      definition: { match: 'all', rules: [{ field: 'plan', op: 'eq', value: 'pro' }] },
    })
    const entry = await changelog.createChangelog(ctx, p.id, {
      title: 'For {{plan}} users',
      body: 'hi {{first_name}}',
      status: 'draft',
      labels: [],
      linkedPostIds: [],
      segmentId: seg!.id,
    })
    expect(entry?.segmentId).toBe(seg!.id)
    expect(entry?.recipientCount).toBe(0)
  })
})
