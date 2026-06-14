import {
  aiJobs,
  boards,
  client,
  db,
  endUsers,
  eq,
  newId,
  organizations,
  posts,
  postTranslations,
  projects,
  votes,
} from '@heed/db'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { CompleteOptions, LLMProvider } from '../src/index.ts'
import { dedupPost, embedPost, NoopProvider, processPost, translatePost } from '../src/index.ts'

/** Deterministic bag-of-words embedding so similar text → high cosine similarity. */
function embedText(text: string): number[] {
  const v = new Array(768).fill(0)
  for (const w of text.toLowerCase().split(/\W+/).filter(Boolean)) {
    let h = 0
    for (const ch of w) h = (h * 31 + ch.charCodeAt(0)) >>> 0
    v[h % 768] += 1
  }
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1
  return v.map((x) => x / norm)
}

class MockProvider implements LLMProvider {
  readonly name = 'mock'
  readonly enabled = true
  readonly canEmbed = true
  async embed(texts: string[]) {
    return texts.map(embedText)
  }
  async complete(opts: CompleteOptions) {
    const user = opts.messages.map((m) => m.content).join('\n')
    if (opts.json) {
      const locale = user.match(/locale "(\w+)"/)?.[1] ?? 'xx'
      const title = user.match(/Title: (.*)/)?.[1] ?? ''
      const body = user.match(/Body: ([\s\S]*)/)?.[1] ?? ''
      return JSON.stringify({ title: `[${locale}] ${title}`, body: `[${locale}] ${body}` })
    }
    return 'Mock label'
  }
}

const provider = new MockProvider()
let projectId: string
let orgId: string
let boardId: string
let postA: string
let postB: string
let postC: string

beforeAll(async () => {
  orgId = newId('organization')
  projectId = newId('project')
  boardId = newId('board')
  await db.insert(organizations).values({
    id: orgId,
    slug: `ai-${orgId.slice(-6)}`,
    name: 'AI Test',
    locales: ['en', 'es', 'fr'],
  })
  await db.insert(projects).values({
    id: projectId,
    orgId,
    slug: 'p',
    name: 'P',
    publicKey: `pk_${newId('project')}`,
    endUserJwtSecret: 'x'.repeat(32),
  })
  await db.insert(boards).values({ id: boardId, projectId, slug: 'b', name: 'B', kind: 'feature' })

  const mk = async (title: string, body: string) => {
    const id = newId('post')
    await db.insert(posts).values({ id, projectId, boardId, title, body, originalLocale: 'en' })
    return id
  }
  postA = await mk(
    'Add dark mode to the dashboard',
    'My eyes hurt at night, please add a dark theme.',
  )
  postB = await mk(
    'Add dark mode to the dashboard',
    'My eyes hurt at night, please add a dark theme.',
  )
  postC = await mk('Export data to CSV', 'I want to export all ideas to a CSV file.')
})

afterAll(async () => {
  await db.delete(organizations).where(eq(organizations.id, orgId))
  await client.end()
})

describe('embedding + dedup (suggestions only)', () => {
  test('embedPost writes a vector', async () => {
    const emb = await embedPost(provider, postA)
    expect(emb?.length).toBe(768)
    await embedPost(provider, postB)
    await embedPost(provider, postC)
  })

  test('a near-duplicate produces a merge suggestion (never auto-merge)', async () => {
    const suggestions = await dedupPost(provider, postB)
    expect(suggestions.length).toBeGreaterThan(0)
    expect(suggestions[0]?.postId).toBe(postA)
    expect(suggestions[0]?.similarity).toBeGreaterThan(0.86)
    // the unrelated post is not suggested
    expect(suggestions.some((s) => s.postId === postC)).toBe(false)
    // suggestion persisted as an ai_job, and the post is NOT merged
    const jobs = await db.select().from(aiJobs).where(eq(aiJobs.inputRef, postB))
    expect(jobs.length).toBe(1)
    const [row] = await db
      .select({ merged: posts.mergedIntoPostId })
      .from(posts)
      .where(eq(posts.id, postB))
    expect(row?.merged).toBeNull()
  })
})

describe('cross-language translation', () => {
  test('translatePost writes es + fr translations on the canonical post', async () => {
    const done = await translatePost(provider, postA)
    expect(done.sort()).toEqual(['es', 'fr'])

    const translations = await db
      .select()
      .from(postTranslations)
      .where(eq(postTranslations.postId, postA))
    const byLocale = new Map(translations.map((t) => [t.locale, t]))
    expect(byLocale.get('es')?.title).toContain('[es]')
    expect(byLocale.get('fr')?.title).toContain('[fr]')
    // every translation points at the SAME canonical post → cross-language voting
    expect(translations.every((t) => t.postId === postA)).toBe(true)
  })

  test('a vote from any locale lands on the canonical post', async () => {
    const euId = newId('endUser')
    await db.insert(endUsers).values({ id: euId, projectId, isAnonymous: true, locale: 'es' })
    // a Spanish-speaking voter's vote lands on the same canonical row an English view votes on
    await db.insert(votes).values({ id: newId('vote'), postId: postA, endUserId: euId })
    const rows = await db.select().from(votes).where(eq(votes.postId, postA))
    expect(rows.length).toBe(1)
  })
})

describe('graceful degradation (NoopProvider)', () => {
  const noop = new NoopProvider()
  test('all tasks no-op cleanly when AI is disabled', async () => {
    expect(await embedPost(noop, postA)).toBeNull()
    expect(await dedupPost(noop, postA)).toEqual([])
    expect(await translatePost(noop, postA)).toEqual([])
    expect(await processPost(noop, postA)).toEqual({ suggestions: [], translated: [] })
  })
})
