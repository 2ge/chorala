import { afterAll, expect, test } from 'vitest'
import { client, db, eq, schema } from '../src/index.ts'

afterAll(async () => {
  await client.end()
})

test('seeded posts are readable back', async () => {
  const posts = await db.select().from(schema.posts)
  expect(posts.length).toBeGreaterThan(0)

  const first = posts[0]
  expect(first).toBeDefined()
  expect(first?.title).toBeTypeOf('string')
  expect(first?.projectId).toMatch(/^proj_/)
})

test('a post links to its board and project', async () => {
  const [post] = await db.select().from(schema.posts).limit(1)
  expect(post).toBeDefined()
  if (!post) return

  const [board] = await db.select().from(schema.boards).where(eq(schema.boards.id, post.boardId))
  expect(board?.projectId).toBe(post.projectId)
})

test('cross-language translations exist on the canonical post', async () => {
  const translations = await db.select().from(schema.postTranslations)
  const locales = new Set(translations.map((t) => t.locale))
  // seed adds es + fr auto-translations
  expect(locales.has('es')).toBe(true)
  expect(locales.has('fr')).toBe(true)
})
